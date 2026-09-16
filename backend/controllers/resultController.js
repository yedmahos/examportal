const mongoose = require("mongoose");
const Result = require("../models/Result");
const User = require("../models/User");
const Exam = require("../models/Exam");
const { logActivity } = require("../services/activityLogger");

const calculateGrade = (percentage) => {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 50) return "D";
    if (percentage >= 40) return "E";
    return "F";
};

const calculateStatus = (percentage) => {
    return percentage >= 40 ? "passed" : "failed";
};

const createResult = async (req, res) => {
    try {
        const {
            student,
            exam,
            marksObtained,
            maximumMarks
        } = req.body;

        if (
            !student ||
            !exam ||
            marksObtained === undefined ||
            maximumMarks === undefined
        ) {
            return res.status(400).json({
                message: "Student, exam, marks obtained and maximum marks are required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(student)) {
            return res.status(400).json({
                message: "Invalid student ID"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(exam)) {
            return res.status(400).json({
                message: "Invalid exam ID"
            });
        }

        const studentUser = await User.findOne({
            _id: student,
            role: "student",
            status: "active"
        });

        if (!studentUser) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        const examRecord = await Exam.findById(exam);

        if (!examRecord) {
            return res.status(404).json({
                message: "Exam not found"
            });
        }

        if (
            maximumMarks <= 0 ||
            marksObtained < 0 ||
            marksObtained > maximumMarks
        ) {
            return res.status(400).json({
                message: "Marks obtained must be between 0 and maximum marks"
            });
        }

        const existingResult = await Result.findOne({
            student,
            exam
        });

        if (existingResult) {
            return res.status(409).json({
                message: "Result already exists for this student and exam"
            });
        }

        const percentage = Number(
            ((marksObtained / maximumMarks) * 100).toFixed(2)
        );

        const grade = calculateGrade(percentage);
        const status = calculateStatus(percentage);

        const result = await Result.create({
            student,
            exam,
            marksObtained,
            maximumMarks,
            percentage,
            grade,
            status,
            published: false,
            createdBy: req.user.userId
        });

        await logActivity({
            user: req.user.userId,
            action: "CREATE",
            entity: "Result",
            entityId: result._id,
            description: `Created result for ${studentUser.name}`,
            ipAddress: req.ip
        });

        const populatedResult = await Result.findById(result._id)
            .populate(
                "student",
                "name email studentId department"
            )
            .populate(
                "exam",
                "title subject examDate"
            );

        res.status(201).json({
            message: "Result created successfully",
            result: populatedResult
        });
    } catch (error) {
        console.error("Create result error:", error.message);

        res.status(500).json({
            message: "Server error while creating result"
        });
    }
};

const getAllResults = async (req, res) => {
    try {
        const results = await Result.find()
            .populate(
                "student",
                "name email studentId department"
            )
            .populate(
                "exam",
                "title subject examDate"
            )
            .populate(
                "createdBy",
                "name email"
            )
            .sort({ createdAt: -1 });

        res.status(200).json({
            count: results.length,
            results
        });
    } catch (error) {
        console.error("Get results error:", error.message);

        res.status(500).json({
            message: "Server error while fetching results"
        });
    }
};

const getMyResults = async (req, res) => {
    try {
        const results = await Result.find({
            student: req.user.userId,
            published: true
        })
            .populate(
                "exam",
                "title subject examDate venue"
            )
            .sort({ createdAt: -1 });

        res.status(200).json({
            count: results.length,
            results
        });
    } catch (error) {
        console.error(
            "Get my results error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while fetching your results"
        });
    }
};

const getResultById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid result ID"
            });
        }

        const result = await Result.findById(id)
            .populate(
                "student",
                "name email studentId department"
            )
            .populate(
                "exam",
                "title subject examDate venue"
            )
            .populate(
                "createdBy",
                "name email"
            );

        if (!result) {
            return res.status(404).json({
                message: "Result not found"
            });
        }

        if (req.user.role === "student") {
            const resultStudentId =
                result.student._id.toString();

            const currentUserId =
                req.user.userId.toString();

            if (
                resultStudentId !== currentUserId ||
                !result.published
            ) {
                return res.status(403).json({
                    message: "Access denied"
                });
            }
        }

        res.status(200).json({
            result
        });
    } catch (error) {
        console.error(
            "Get result error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while fetching result"
        });
    }
};

const updateResult = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid result ID"
            });
        }

        const result = await Result.findById(id);

        if (!result) {
            return res.status(404).json({
                message: "Result not found"
            });
        }

        const marksObtained =
            req.body.marksObtained !== undefined
                ? req.body.marksObtained
                : result.marksObtained;

        const maximumMarks =
            req.body.maximumMarks !== undefined
                ? req.body.maximumMarks
                : result.maximumMarks;

        if (
            maximumMarks <= 0 ||
            marksObtained < 0 ||
            marksObtained > maximumMarks
        ) {
            return res.status(400).json({
                message: "Marks obtained must be between 0 and maximum marks"
            });
        }

        const percentage = Number(
            ((marksObtained / maximumMarks) * 100).toFixed(2)
        );

        result.marksObtained = marksObtained;
        result.maximumMarks = maximumMarks;
        result.percentage = percentage;
        result.grade = calculateGrade(percentage);
        result.status = calculateStatus(percentage);

        if (req.body.published !== undefined) {
            result.published = req.body.published;

            if (
                req.body.published === true &&
                !result.publishedAt
            ) {
                result.publishedAt = new Date();
            }

            if (req.body.published === false) {
                result.publishedAt = null;
            }
        }

        await result.save();

        await logActivity({
            user: req.user.userId,
            action: "UPDATE",
            entity: "Result",
            entityId: result._id,
            description: "Updated result",
            ipAddress: req.ip
        });

        const populatedResult = await Result.findById(result._id)
            .populate(
                "student",
                "name email studentId department"
            )
            .populate(
                "exam",
                "title subject examDate"
            )
            .populate(
                "createdBy",
                "name email"
            );

        res.status(200).json({
            message: "Result updated successfully",
            result: populatedResult
        });
    } catch (error) {
        console.error(
            "Update result error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while updating result"
        });
    }
};

const publishResult = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid result ID"
            });
        }

        const result = await Result.findByIdAndUpdate(
            id,
            {
                published: true,
                publishedAt: new Date()
            },
            {
                new: true
            }
        )
            .populate(
                "student",
                "name email studentId"
            )
            .populate(
                "exam",
                "title subject examDate"
            );

        if (!result) {
            return res.status(404).json({
                message: "Result not found"
            });
        }

        await logActivity({
            user: req.user.userId,
            action: "PUBLISH",
            entity: "Result",
            entityId: result._id,
            description: "Published result",
            ipAddress: req.ip
        });

        res.status(200).json({
            message: "Result published successfully",
            result
        });
    } catch (error) {
        console.error(
            "Publish result error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while publishing result"
        });
    }
};

const unpublishResult = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid result ID"
            });
        }

        const result = await Result.findByIdAndUpdate(
            id,
            {
                published: false,
                publishedAt: null
            },
            {
                new: true
            }
        )
            .populate(
                "student",
                "name email studentId"
            )
            .populate(
                "exam",
                "title subject examDate"
            );

        if (!result) {
            return res.status(404).json({
                message: "Result not found"
            });
        }

        await logActivity({
            user: req.user.userId,
            action: "UNPUBLISH",
            entity: "Result",
            entityId: result._id,
            description: "Unpublished result",
            ipAddress: req.ip
        });

        res.status(200).json({
            message: "Result unpublished successfully",
            result
        });
    } catch (error) {
        console.error(
            "Unpublish result error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while unpublishing result"
        });
    }
};

module.exports = {
    createResult,
    getAllResults,
    getMyResults,
    getResultById,
    updateResult,
    publishResult,
    unpublishResult
};