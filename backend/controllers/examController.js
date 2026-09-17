const mongoose = require("mongoose");
const Exam = require("../models/Exam");
const { logActivity } = require("../services/activityLogger");

const parseSemester = (value) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    if (typeof value === "number") {
        return value;
    }

    const match = String(value).match(/\d+/);

    return match ? Number(match[0]) : null;
};

const parseDuration = (value) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    if (typeof value === "number") {
        return value;
    }

    const match = String(value).match(/\d+/);

    return match ? Number(match[0]) : null;
};

const normalizeStatus = (value) => {
    if (!value) {
        return "scheduled";
    }

    return String(value).toLowerCase();
};

const createExam = async (req, res) => {
    try {
        const {
            title,
            subject,
            examCode,
            department,
            program,
            semester,
            academicYear,
            examDate,
            date,
            startTime,
            endTime,
            venue,
            duration,
            instructions,
            status
        } = req.body;

        const normalizedSemester = parseSemester(semester);
        const normalizedDuration = parseDuration(duration);
        const normalizedExamDate = examDate || date;
        const normalizedStatus = normalizeStatus(status);

        if (
            !title ||
            !subject ||
            !department ||
            !program ||
            !normalizedSemester ||
            !academicYear ||
            !normalizedExamDate ||
            !startTime ||
            !endTime ||
            !venue ||
            !normalizedDuration
        ) {
            return res.status(400).json({
                message: "All required exam fields must be provided"
            });
        }

        if (
            normalizedSemester < 1 ||
            normalizedSemester > 12
        ) {
            return res.status(400).json({
                message: "Semester must be between 1 and 12"
            });
        }

        if (normalizedDuration < 1) {
            return res.status(400).json({
                message: "Duration must be greater than 0"
            });
        }

        const exam = await Exam.create({
            title: String(title).trim(),
            subject: String(subject).trim(),
            examCode: examCode ? String(examCode).trim() : "",
            department: String(department).trim(),
            program: String(program).trim(),
            semester: normalizedSemester,
            academicYear: String(academicYear).trim(),
            examDate: normalizedExamDate,
            startTime,
            endTime,
            venue: String(venue).trim(),
            duration: normalizedDuration,
            instructions: instructions || "",
            status: normalizedStatus,
            createdBy: req.user.userId
        });

        await logActivity({
            user: req.user.userId,
            action: "CREATE",
            entity: "Exam",
            entityId: exam._id,
            description: `Created exam ${exam.title}`,
            ipAddress: req.ip
        });

        res.status(201).json({
            message: "Exam created successfully",
            exam
        });
    } catch (error) {
        console.error("Create exam error:", error);

        res.status(500).json({
            message: "Server error while creating exam"
        });
    }
};

const getAllExams = async (req, res) => {
    try {
        const { search, department, semester, status } = req.query;
        const query = { isArchived: false };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { subject: { $regex: search, $options: "i" } },
                { examCode: { $regex: search, $options: "i" } }
            ];
        }

        if (department && department !== "All") {
            query.department = department;
        }

        if (semester && semester !== "All") {
            const semNum = parseSemester(semester);
            if (semNum) query.semester = semNum;
        }

        if (status && status !== "All") {
            const statusVal = String(status).toLowerCase();
            if (statusVal === "upcoming" || statusVal === "scheduled") {
                query.status = { $in: ["scheduled", "ongoing"] };
            } else {
                query.status = statusVal;
            }
        }

        const exams = await Exam.find(query)
            .populate("createdBy", "name email role")
            .sort({ examDate: 1 });

        res.status(200).json({
            count: exams.length,
            exams
        });
    } catch (error) {
        console.error("Get exams error:", error.message);

        res.status(500).json({
            message: "Server error while fetching exams"
        });
    }
};

const getExamById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid exam ID"
            });
        }

        const exam = await Exam.findOne({
            _id: id,
            isArchived: false
        }).populate(
            "createdBy",
            "name email role"
        );

        if (!exam) {
            return res.status(404).json({
                message: "Exam not found"
            });
        }

        res.status(200).json({
            exam
        });
    } catch (error) {
        console.error("Get exam error:", error.message);

        res.status(500).json({
            message: "Server error while fetching exam"
        });
    }
};

const updateExam = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid exam ID"
            });
        }

        const allowedFields = [
            "title",
            "subject",
            "department",
            "program",
            "semester",
            "academicYear",
            "examCode",
            "examDate",
            "date",
            "startTime",
            "endTime",
            "venue",
            "room",
            "duration",
            "instructions",
            "status"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (updates.date && !updates.examDate) {
            updates.examDate = updates.date;
            delete updates.date;
        }

        if (updates.semester !== undefined) {
            const normalizedSemester =
                parseSemester(updates.semester);

            if (
                normalizedSemester === null ||
                normalizedSemester < 1 ||
                normalizedSemester > 12
            ) {
                return res.status(400).json({
                    message:
                        "Semester must be between 1 and 12"
                });
            }

            updates.semester = normalizedSemester;
        }

        if (updates.duration !== undefined) {
            const normalizedDuration =
                parseDuration(updates.duration);

            if (
                normalizedDuration === null ||
                normalizedDuration < 1
            ) {
                return res.status(400).json({
                    message:
                        "Duration must be greater than 0"
                });
            }

            updates.duration = normalizedDuration;
        }

        if (updates.status) {
            updates.status =
                normalizeStatus(updates.status);
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message:
                    "No valid fields provided for update"
            });
        }

        const exam = await Exam.findOneAndUpdate(
            {
                _id: id,
                isArchived: false
            },
            updates,
            {
                new: true,
                runValidators: true
            }
        ).populate(
            "createdBy",
            "name email role"
        );

        if (!exam) {
            return res.status(404).json({
                message: "Exam not found"
            });
        }

        await logActivity({
            user: req.user.userId,
            action: "UPDATE",
            entity: "Exam",
            entityId: exam._id,
            description: `Updated exam ${exam.title}`,
            ipAddress: req.ip
        });

        res.status(200).json({
            message: "Exam updated successfully",
            exam
        });
    } catch (error) {
        console.error("Update exam error:", error);

        res.status(500).json({
            message: "Server error while updating exam"
        });
    }
};

const deleteExam = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid exam ID"
            });
        }

        const exam = await Exam.findOneAndUpdate(
            {
                _id: id,
                isArchived: false
            },
            {
                isArchived: true
            },
            {
                new: true
            }
        );

        if (!exam) {
            return res.status(404).json({
                message: "Exam not found"
            });
        }

        await logActivity({
            user: req.user.userId,
            action: "ARCHIVE",
            entity: "Exam",
            entityId: exam._id,
            description: `Archived exam ${exam.title}`,
            ipAddress: req.ip
        });

        res.status(200).json({
            message: "Exam archived successfully"
        });
    } catch (error) {
        console.error("Archive exam error:", error);

        res.status(500).json({
            message:
                "Server error while archiving exam"
        });
    }
};

module.exports = {
    createExam,
    getAllExams,
    getExamById,
    updateExam,
    deleteExam
};