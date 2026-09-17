const mongoose = require("mongoose");
const User = require("../models/User");
const { logActivity } = require("../services/activityLogger");

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

        if (department) {
            query.department = department;
        }

        if (semester) {
            query.semester = Number(semester);
        }

        if (status) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                {
                    name: {
                        $regex: search,
                        $options: "i"
                    }
                },
                {
                    email: {
                        $regex: search,
                        $options: "i"
                    }
                },
                {
                    studentId: {
                        $regex: search,
                        $options: "i"
                    }
                }
            ];
        }

        const students = await User.find(query)
            .select("-password")
            .sort({ createdAt: -1 });

        res.status(200).json({
            count: students.length,
            students
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
    updateStudent,
    updateStudentStatus
};