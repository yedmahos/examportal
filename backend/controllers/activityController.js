const ActivityLog = require("../models/ActivityLog");

const getRecentActivities = async (req, res) => {
    try {
        const activities = await ActivityLog.find()
            .populate("user", "name email role")
            .sort({ createdAt: -1 })
            .limit(20);

        res.status(200).json({
            count: activities.length,
            activities
        });
    } catch (error) {
        console.error("Get activities error:", error.message);

        res.status(500).json({
            message: "Server error while fetching activities"
        });
    }
};

module.exports = {
    getRecentActivities
};