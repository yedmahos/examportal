const express = require("express");

const {
    getStudentDashboard,
    getAdminDashboard
} = require("../controllers/dashboardController");

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");

const router = express.Router();

// Student dashboard
router.get(
    "/student",
    protect,
    authorize("student"),
    getStudentDashboard
);

// Admin dashboard
router.get(
    "/admin",
    protect,
    authorize("admin"),
    getAdminDashboard
);

module.exports = router;