const mongoose = require("mongoose");
const Result = require("../models/Result");
const User = require("../models/User");
const Exam = require("../models/Exam");
const { logActivity } = require("../services/activityLogger");
const {
    parseSemester,
    escapeRegex,
    parsePagination,
    paginationMeta
} = require("../utils/query");

const EXAM_RESULT_FIELDS =
    "title subject examCode examDate venue room semester academicYear";

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
                EXAM_RESULT_FIELDS
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

const emptyResultPage = (res, page, limit) => {
    return res.status(200).json({
        results: [],
        ...paginationMeta({
            page,
            limit,
            total: 0
        })
    });
};

const getAllResults = async (req, res) => {
    try {
        const {
            search,
            department,
            semester,
            status,
            studentId,
            student
        } = req.query;

        const { page, limit, skip } = parsePagination(req.query);
        const query = {};

        if (student && mongoose.Types.ObjectId.isValid(student)) {
            query.student = student;
        } else if (studentId) {
            const matchedStudent = await User.findOne({
                studentId: String(studentId).trim(),
                role: "student"
            }).select("_id");

            if (!matchedStudent) {
                return emptyResultPage(res, page, limit);
            }

            query.student = matchedStudent._id;
        }

        if (department && department !== "All") {
            const departmentStudents = await User.find({
                role: "student",
                department
            }).select("_id");

            const departmentIds = departmentStudents.map(
                (item) => item._id
            );

            if (query.student) {
                const selectedId = String(query.student);
                const allowed = departmentIds.some(
                    (item) => String(item) === selectedId
                );

                if (!allowed) {
                    return emptyResultPage(res, page, limit);
                }
            } else {
                query.student = { $in: departmentIds };
            }
        }

        if (semester && semester !== "All") {
            const semesterNumber = parseSemester(semester);

            if (semesterNumber) {
                const semesterExams = await Exam.find({
                    semester: semesterNumber
                }).select("_id");

                query.exam = {
                    $in: semesterExams.map((item) => item._id)
                };
            }
        }

        if (status && status !== "All") {
            const normalizedStatus = String(status)
                .trim()
                .toLowerCase();

            if (normalizedStatus === "published") {
                query.published = true;
            } else if (
                normalizedStatus === "draft" ||
                normalizedStatus === "unpublished"
            ) {
                query.published = false;
            } else if (
                normalizedStatus === "passed" ||
                normalizedStatus === "failed"
            ) {
                query.status = normalizedStatus;
            } else {
                return emptyResultPage(res, page, limit);
            }
        }

        if (search) {
            const regex = new RegExp(escapeRegex(search), "i");

            const [matchedStudents, matchedExams] = await Promise.all([
                User.find({
                    role: "student",
                    $or: [
                        { name: regex },
                        { studentId: regex },
                        { email: regex }
                    ]
                }).select("_id"),
                Exam.find({
                    $or: [
                        { title: regex },
                        { subject: regex },
                        { examCode: regex }
                    ]
                }).select("_id")
            ]);

            query.$and = [
                ...(query.$and || []),
                {
                    $or: [
                        {
                            student: {
                                $in: matchedStudents.map((item) => item._id)
                            }
                        },
                        {
                            exam: {
                                $in: matchedExams.map((item) => item._id)
                            }
                        }
                    ]
                }
            ];
        }

        const [results, total] = await Promise.all([
            Result.find(query)
                .populate(
                    "student",
                    "name email studentId department"
                )
                .populate(
                    "exam",
                    EXAM_RESULT_FIELDS
                )
                .populate(
                    "createdBy",
                    "name email"
                )
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Result.countDocuments(query)
        ]);

        res.status(200).json({
            results,
            ...paginationMeta({ page, limit, total })
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
                EXAM_RESULT_FIELDS
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
                EXAM_RESULT_FIELDS
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
                EXAM_RESULT_FIELDS
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
                EXAM_RESULT_FIELDS
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
                EXAM_RESULT_FIELDS
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

const deleteResult = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid result ID"
            });
        }

        const result = await Result.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).json({
                message: "Result not found"
            });
        }

        await logActivity({
            user: req.user.userId,
            action: "DELETE",
            entity: "Result",
            entityId: result._id,
            description: "Deleted result",
            ipAddress: req.ip
        });

        res.status(200).json({
            message: "Result deleted successfully"
        });
    } catch (error) {
        console.error(
            "Delete result error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while deleting result"
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
    unpublishResult,
    deleteResult
};