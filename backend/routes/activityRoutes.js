const express = require("express");

const {
    getRecentActivities
} = require("../controllers/activityController");

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");
const { GROUPS } = require("../utils/roles");

const router = express.Router();

// Get recent activities
router.get(
    "/",
    protect,
    authorize(...GROUPS.systemWriters),
    getRecentActivities
);

module.exports = router;