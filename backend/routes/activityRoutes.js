const express = require("express");

const {
    getRecentActivities
} = require("../controllers/activityController");

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/",
    protect,
    authorize("admin"),
    getRecentActivities
);

module.exports = router;