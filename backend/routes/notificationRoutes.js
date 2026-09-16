const express = require("express");

const {
    createNotification,
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
} = require("../controllers/notificationController");

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");

const router = express.Router();

// Get logged-in user's notifications
router.get(
    "/",
    protect,
    getMyNotifications
);

// Create notification
// Admin only
router.post(
    "/",
    protect,
    authorize("admin"),
    createNotification
);

// Mark one as read
router.patch(
    "/:id/read",
    protect,
    markAsRead
);

// Mark all as read
router.patch(
    "/read-all",
    protect,
    markAllAsRead
);

// Delete notification
router.delete(
    "/:id",
    protect,
    deleteNotification
);

module.exports = router;