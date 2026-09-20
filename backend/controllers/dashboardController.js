const User = require("../models/User");
const Exam = require("../models/Exam");
const Result = require("../models/Result");
const Announcement = require("../models/Announcement");
const Notification = require("../models/Notification");
const ActivityLog = require("../models/ActivityLog");

// Get student dashboard
const getStudentDashboard = async (req, res) => {
    try {
        const now = new Date();

        const student = await User.findById(req.user.userId)
            .select("-password");

        if (!student) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        const upcomingExams = await Exam.find({
            department: student.department,
            program: student.program,
            semester: student.semester,
            academicYear: student.academicYear,
            examDate: { $gte: now },
            status: {
                $in: ["scheduled", "ongoing"]
            },
            isArchived: false
        })
            .sort({ examDate: 1 })
            .limit(5);

        const recentResults = await Result.find({
            student: req.user.userId,
            published: true
        })
            .populate({
                path: "exam",
                select: "examCode title subject examDate semester venue duration status"
            })
            .sort({ createdAt: -1 })
            .limit(5);

        const announcements = await Announcement.find({
            published: true,
            publishDate: { $lte: now },
            $or: [
                { expiryDate: null },
                { expiryDate: { $gte: now } }
            ],
            targetAudience: {
                $in: ["all", "students"]
            }
        })
            .sort({
                priority: -1,
                publishDate: -1
            })
            .limit(5);

        const notifications = await Notification.find({
            recipient: req.user.userId
        })
            .sort({ createdAt: -1 })
            .limit(5);

        const unreadNotifications = await Notification.countDocuments({
            recipient: req.user.userId,
            isRead: false
        });

        const resultStats = await Result.aggregate([
            {
                $match: {
                    student: student._id,
                    published: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalResults: { $sum: 1 },
                    averagePercentage: {
                        $avg: "$percentage"
                    },
                    passed: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", "passed"] },
                                1,
                                0
                            ]
                        }
                    },
                    failed: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", "failed"] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const performance = resultStats[0] || {
            totalResults: 0,
            averagePercentage: 0,
            passed: 0,
            failed: 0
        };

        performance.averagePercentage = Number(
            performance.averagePercentage.toFixed(2)
        );

        res.status(200).json({
            student,
            upcomingExams,
            recentResults,
            announcements,
            notifications,
            unreadNotifications,
            performance
        });
    } catch (error) {
        console.error(
            "Get student dashboard error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while fetching student dashboard"
        });
    }
};

// Get admin dashboard
const getAdminDashboard = async (req, res) => {
    try {
        const now = new Date();

        const [
            totalStudents,
            totalExams,
            upcomingExams,
            completedExams,
            publishedResults,
            totalAnnouncements
        ] = await Promise.all([
            User.countDocuments({
                role: "student"
            }),

            Exam.countDocuments({
                isArchived: false
            }),

            Exam.countDocuments({
                isArchived: false,
                examDate: { $gte: now },
                status: "scheduled"
            }),

            Exam.countDocuments({
                isArchived: false,
                status: "completed"
            }),

            Result.countDocuments({
                published: true
            }),

            Announcement.countDocuments()
        ]);

        const recentExams = await Exam.find({
            isArchived: false
        })
            .sort({ createdAt: -1 })
            .limit(5);

        const recentResults = await Result.find()
            .populate(
                "student",
                "name studentId"
            )
            .populate({
                path: "exam",
                select: "title subject examDate"
            })
            .sort({ createdAt: -1 })
            .limit(5);

        const recentAnnouncements =
            await Announcement.find()
                .sort({ createdAt: -1 })
                .limit(5);

        const recentActivities = await ActivityLog.find()
            .populate("user", "name email role")
            .sort({ createdAt: -1 })
            .limit(5);

        const examTrendsAggregation = await Exam.aggregate([
            {
                $match: { isArchived: false, examDate: { $ne: null } }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$examDate" },
                        month: { $month: "$examDate" }
                    },
                    scheduledCount: {
                        $sum: { $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0] }
                    },
                    completedCount: {
                        $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
                    }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1 }
            }
        ]);

        const examTrends = examTrendsAggregation.map(trend => {
            const date = new Date(trend._id.year, trend._id.month - 1, 1);
            const monthName = date.toLocaleString('default', { month: 'short' });
            return {
                label: monthName,
                scheduled: trend.scheduledCount,
                completed: trend.completedCount
            };
        });

        res.status(200).json({
            statistics: {
                totalStudents,
                totalExams,
                upcomingExams,
                completedExams,
                publishedResults,
                totalAnnouncements
            },
            recentExams,
            recentResults,
            recentAnnouncements,
            recentActivities,
            examTrends
        });
    } catch (error) {
        console.error(
            "Get admin dashboard error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while fetching admin dashboard"
        });
    }
};

module.exports = {
    getStudentDashboard,
    getAdminDashboard
};