const mongoose = require("mongoose");
const Exam = require("../models/Exam");
const { logActivity } = require("../services/activityLogger");

const createExam = async (req, res) => {
    try {
        const {
            title,
            subject,
            department,
            program,
            semester,
            academicYear,
            examDate,
            startTime,
            endTime,
            venue,
            duration,
            instructions,
            status
        } = req.body;

        if (
            !title ||
            !subject ||
            !department ||
            !program ||
            !semester ||
            !academicYear ||
            !examDate ||
            !startTime ||
            !endTime ||
            !venue ||
            !duration
        ) {
            return res.status(400).json({
                message: "All required exam fields must be provided"
            });
        }

        const exam = await Exam.create({
            title,
            subject,
            department,
            program,
            semester,
            academicYear,
            examDate,
            startTime,
            endTime,
            venue,
            duration,
            instructions: instructions || "",
            status: status || "scheduled",
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
        console.error("Create exam error:", error.message);

        res.status(500).json({
            message: "Server error while creating exam"
        });
    }
};

const getAllExams = async (req, res) => {
    try {
        const exams = await Exam.find({
            isArchived: false
        })
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
        }).populate("createdBy", "name email role");

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
            "examDate",
            "startTime",
            "endTime",
            "venue",
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

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message: "No valid fields provided for update"
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
        ).populate("createdBy", "name email role");

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
        console.error("Update exam error:", error.message);

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
        console.error("Archive exam error:", error.message);

        res.status(500).json({
            message: "Server error while archiving exam"
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