const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { logActivity } = require("../services/activityLogger");
const {
    parseSemester,
    escapeRegex,
    parsePagination,
    paginationMeta
} = require("../utils/query");

const getAllStudents = async (req, res) => {
    try {
        const {
            search,
            department,
            semester,
            status
        } = req.query;

        const query = {
            role: "student"
        };

        if (department && department !== "All") {
            query.department = department;
        }

        if (semester && semester !== "All") {
            const semesterNumber = parseSemester(semester);

            if (semesterNumber) {
                query.semester = semesterNumber;
            }
        }

        if (status && status !== "All") {
            query.status = String(status).trim().toLowerCase();
        }

        if (search) {
            const regex = new RegExp(escapeRegex(search), "i");

            query.$or = [
                { name: regex },
                { email: regex },
                { studentId: regex }
            ];
        }

        const { page, limit, skip } = parsePagination(req.query);

        const [students, total] = await Promise.all([
            User.find(query)
                .select("-password")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments(query)
        ]);

        res.status(200).json({
            students,
            ...paginationMeta({ page, limit, total })
        });
    } catch (error) {
        console.error("Get students error:", error.message);

        res.status(500).json({
            message: "Server error while fetching students"
        });
    }
};

const getStudentById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid student ID"
            });
        }

        const student = await User.findOne({
            _id: id,
            role: "student"
        }).select("-password");

        if (!student) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.status(200).json({
            student
        });
    } catch (error) {
        console.error("Get student error:", error.message);

        res.status(500).json({
            message: "Server error while fetching student"
        });
    }
};

const createStudent = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            studentId,
            department,
            program,
            semester,
            academicYear,
            phone,
            status,
            gpa,
            creditsCompleted,
            totalCredits,
            academicStanding
        } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message:
                    "Name, email and password are required"
            });
        }

        const normalizedEmail =
            email.trim().toLowerCase();

        const normalizedSemester =
            parseSemester(semester);

        if (normalizedSemester !== null) {
            if (
                normalizedSemester < 1 ||
                normalizedSemester > 12
            ) {
                return res.status(400).json({
                    message:
                        "Semester must be between 1 and 12"
                });
            }
        }

        const normalizedStatus = status
            ? String(status).trim().toLowerCase()
            : "active";

        if (
            !["active", "inactive"].includes(
                normalizedStatus
            )
        ) {
            return res.status(400).json({
                message:
                    "Status must be active or inactive"
            });
        }

        // Academic figures are optional. An empty field is
        // stored as null so the UI can show N/A instead of
        // an invented value.
        const parseOptionalNumber = (value) => {
            if (
                value === undefined ||
                value === null ||
                value === ""
            ) {
                return null;
            }

            return Number(value);
        };

        const normalizedGpa = parseOptionalNumber(gpa);

        if (
            normalizedGpa !== null &&
            (isNaN(normalizedGpa) ||
                normalizedGpa < 0 ||
                normalizedGpa > 4)
        ) {
            return res.status(400).json({
                message: "GPA must be between 0 and 4"
            });
        }

        const normalizedCreditsCompleted =
            parseOptionalNumber(creditsCompleted);

        if (
            normalizedCreditsCompleted !== null &&
            (isNaN(normalizedCreditsCompleted) ||
                normalizedCreditsCompleted < 0)
        ) {
            return res.status(400).json({
                message:
                    "creditsCompleted must be a positive number"
            });
        }

        const normalizedTotalCredits =
            parseOptionalNumber(totalCredits);

        if (
            normalizedTotalCredits !== null &&
            (isNaN(normalizedTotalCredits) ||
                normalizedTotalCredits < 0)
        ) {
            return res.status(400).json({
                message:
                    "totalCredits must be a positive number"
            });
        }

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message:
                    "User with this email already exists"
            });
        }

        if (studentId) {
            const existingStudent =
                await User.findOne({
                    studentId: studentId.trim()
                });

            if (existingStudent) {
                return res.status(409).json({
                    message: "Student ID already exists"
                });
            }
        }

        const hashedPassword = await bcrypt.hash(
            password,
            12
        );

        const created = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "student",
            studentId: studentId
                ? studentId.trim()
                : undefined,
            department: department
                ? department.trim()
                : undefined,
            program: program
                ? program.trim()
                : undefined,
            semester: normalizedSemester,
            academicYear: academicYear
                ? academicYear.trim()
                : undefined,
            phone: phone ? phone.trim() : undefined,
            status: normalizedStatus,
            gpa: normalizedGpa,
            creditsCompleted: normalizedCreditsCompleted,
            totalCredits: normalizedTotalCredits,
            academicStanding: academicStanding
                ? String(academicStanding).trim()
                : ""
        });

        await logActivity({
            user: req.user.userId,
            action: "CREATE",
            entity: "Student",
            entityId: created._id,
            description: `Created student ${created.name}`,
            ipAddress: req.ip
        });

        const student = await User.findById(
            created._id
        ).select("-password");

        res.status(201).json({
            message: "Student created successfully",
            student
        });
    } catch (error) {
        console.error(
            "Create student error:",
            error.message
        );

        if (error.code === 11000) {
            return res.status(409).json({
                message:
                    "Email or student ID already exists"
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: error.message
            });
        }

        res.status(500).json({
            message:
                "Server error while creating student"
        });
    }
};

const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid student ID"
            });
        }

        const student = await User.findOne({
            _id: id,
            role: "student"
        });

        if (!student) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        const allowedFields = [
            "name",
            "email",
            "studentId",
            "department",
            "program",
            "semester",
            "academicYear",
            "phone",
            "profileImage",
            "gpa",
            "creditsCompleted",
            "totalCredits",
            "academicStanding"
        ];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                if (field === "gpa") {
                    const val = req.body[field] === "" || req.body[field] === null ? null : Number(req.body[field]);
                    if (val !== null && (isNaN(val) || val < 0 || val > 4)) {
                        return res.status(400).json({ message: "GPA must be between 0 and 4" });
                    }
                    student[field] = val;
                } else if (field === "creditsCompleted" || field === "totalCredits") {
                    const val = req.body[field] === "" || req.body[field] === null ? null : Number(req.body[field]);
                    if (val !== null && (isNaN(val) || val < 0)) {
                        return res.status(400).json({ message: `${field} must be a positive number` });
                    }
                    student[field] = val;
                } else if (field === "semester") {
                    const raw = req.body[field];

                    if (raw === "" || raw === null) {
                        student[field] = undefined;
                    } else {
                        const val = parseSemester(raw);

                        if (val === null || isNaN(val) || val < 1 || val > 12) {
                            return res.status(400).json({
                                message: "Semester must be between 1 and 12"
                            });
                        }

                        student[field] = val;
                    }
                } else {
                    student[field] = req.body[field];
                }
            }
        }

        await student.save();

        await logActivity({
            user: req.user.userId,
            action: "UPDATE",
            entity: "Student",
            entityId: student._id,
            description: `Updated student ${student.name}`,
            ipAddress: req.ip
        });

        const updatedStudent = await User.findById(
            student._id
        ).select("-password");

        res.status(200).json({
            message: "Student updated successfully",
            student: updatedStudent
        });
    } catch (error) {
        console.error("Update student error:", error.message);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "Email or student ID already exists"
            });
        }

        res.status(500).json({
            message: "Server error while updating student"
        });
    }
};

const updateStudentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid student ID"
            });
        }

        if (!["active", "inactive"].includes(status)) {
            return res.status(400).json({
                message: "Status must be active or inactive"
            });
        }

        const student = await User.findOneAndUpdate(
            {
                _id: id,
                role: "student"
            },
            {
                status
            },
            {
                new: true
            }
        ).select("-password");

        if (!student) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        await logActivity({
            user: req.user.userId,
            action: "STATUS_UPDATE",
            entity: "Student",
            entityId: student._id,
            description: `Changed student ${student.name} status to ${status}`,
            ipAddress: req.ip
        });

        res.status(200).json({
            message: `Student ${status === "active" ? "activated" : "deactivated"} successfully`,
            student
        });
    } catch (error) {
        console.error(
            "Update student status error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while updating student status"
        });
    }
};

module.exports = {
    getAllStudents,
    getStudentById,
    createStudent,
    updateStudent,
    updateStudentStatus
};