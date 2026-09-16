const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const User = require("../models/User");

// CREATE NOTIFICATION
// Admin only
const createNotification = async (req, res) => {
    try {
        const {
            recipient,
            title,
            message,
            type,
            referenceId
        } = req.body;

        if (!recipient || !title || !message) {
            return res.status(400).json({
                message: "Recipient, title and message are required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(recipient)) {
            return res.status(400).json({
                message: "Invalid recipient ID"
            });
        }

        const user = await User.findById(recipient);

        if (!user) {
            return res.status(404).json({
                message: "Recipient user not found"
            });
        }

        const notification = await Notification.create({
            recipient,
            title,
            message,
            type: type || "system",
            referenceId: referenceId || null
        });

        const populatedNotification =
            await Notification.findById(notification._id)
                .populate(
                    "recipient",
                    "name email studentId role"
                );

        res.status(201).json({
            message: "Notification created successfully",
            notification: populatedNotification
        });
    } catch (error) {
        console.error(
            "Create notification error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while creating notification"
        });
    }
};

// GET MY NOTIFICATIONS
const getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({
            recipient: req.user.userId
        }).sort({
            createdAt: -1
        });

        const unreadCount = await Notification.countDocuments({
            recipient: req.user.userId,
            isRead: false
        });

        res.status(200).json({
            count: notifications.length,
            unreadCount,
            notifications
        });
    } catch (error) {
        console.error(
            "Get notifications error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while fetching notifications"
        });
    }
};

// MARK ONE NOTIFICATION AS READ
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid notification ID"
            });
        }

        const notification = await Notification.findOneAndUpdate(
            {
                _id: id,
                recipient: req.user.userId
            },
            {
                isRead: true
            },
            {
                new: true
            }
        );

        if (!notification) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        res.status(200).json({
            message: "Notification marked as read",
            notification
        });
    } catch (error) {
        console.error(
            "Mark notification read error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while updating notification"
        });
    }
};

// MARK ALL NOTIFICATIONS AS READ
const markAllAsRead = async (req, res) => {
    try {
        const result = await Notification.updateMany(
            {
                recipient: req.user.userId,
                isRead: false
            },
            {
                isRead: true
            }
        );

        res.status(200).json({
            message: "All notifications marked as read",
            updatedCount: result.modifiedCount
        });
    } catch (error) {
        console.error(
            "Mark all notifications read error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while updating notifications"
        });
    }
};

// DELETE ONE NOTIFICATION
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid notification ID"
            });
        }

        const notification =
            await Notification.findOneAndDelete({
                _id: id,
                recipient: req.user.userId
            });

        if (!notification) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        res.status(200).json({
            message: "Notification deleted successfully"
        });
    } catch (error) {
        console.error(
            "Delete notification error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while deleting notification"
        });
    }
};

module.exports = {
    createNotification,
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
};