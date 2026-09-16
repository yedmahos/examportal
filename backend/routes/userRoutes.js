const express = require("express");

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");

const router = express.Router();

// Any authenticated user
router.get("/me", protect, (req, res) => {
    res.json({
        message: "Authentication successful",
        user: req.user
    });
});

// Student only
router.get(
    "/student-only",
    protect,
    authorize("student"),
    (req, res) => {
        res.json({
            message: "Student access granted",
            user: req.user
        });
    }
);

// Admin only
router.get(
    "/admin-only",
    protect,
    authorize("admin"),
    (req, res) => {
        res.json({
            message: "Admin access granted",
            user: req.user
        });
    }
);

module.exports = router;