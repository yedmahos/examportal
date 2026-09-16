const mongoose = require("mongoose");
const Announcement = require("../models/Announcement");
const { logActivity } = require("../services/activityLogger");

const createAnnouncement = async (req, res) => {
    try {
        const {
            title,
            content,
            category,
            priority,
            targetAudience,
            publishDate,
            expiryDate,
            published
        } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                message: "Title and content are required"
            });
        }

        const announcement = await Announcement.create({
            title,
            content,
            category: category || "general",
            priority: priority || "normal",
            targetAudience: targetAudience || "students",
            publishDate: publishDate || new Date(),
            expiryDate: expiryDate || null,
            published: published === true,
            createdBy: req.user.userId
        });

        await logActivity({
            user: req.user.userId,
            action: "CREATE",
            entity: "Announcement",
            entityId: announcement._id,
            description: `Created announcement ${announcement.title}`,
            ipAddress: req.ip
        });

        const populatedAnnouncement =
            await Announcement.findById(
                announcement._id
            ).populate(
                "createdBy",
                "name email role"
            );

        res.status(201).json({
            message: "Announcement created successfully",
            announcement: populatedAnnouncement
        });
    } catch (error) {
        console.error(
            "Create announcement error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while creating announcement"
        });
    }
};

const getAnnouncements = async (req, res) => {
    try {
        const now = new Date();

        const query = {
            published: true,
            publishDate: { $lte: now },
            $or: [
                { expiryDate: null },
                { expiryDate: { $gte: now } }
            ]
        };

        if (req.user.role === "student") {
            query.targetAudience = {
                $in: ["all", "students"]
            };
        }

        const announcements =
            await Announcement.find(query)
                .populate(
                    "createdBy",
                    "name email role"
                )
                .sort({
                    priority: -1,
                    publishDate: -1
                });

        res.status(200).json({
            count: announcements.length,
            announcements
        });
    } catch (error) {
        console.error(
            "Get announcements error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while fetching announcements"
        });
    }
};

const getAllAnnouncements = async (req, res) => {
    try {
        const announcements =
            await Announcement.find()
                .populate(
                    "createdBy",
                    "name email role"
                )
                .sort({
                    publishDate: -1,
                    createdAt: -1
                });

        res.status(200).json({
            count: announcements.length,
            announcements
        });
    } catch (error) {
        console.error(
            "Get all announcements error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while fetching announcements"
        });
    }
};

const getAnnouncementById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid announcement ID"
            });
        }

        const announcement =
            await Announcement.findById(id)
                .populate(
                    "createdBy",
                    "name email role"
                );

        if (!announcement) {
            return res.status(404).json({
                message: "Announcement not found"
            });
        }

        if (req.user.role === "student") {
            const now = new Date();

            const isVisible =
                announcement.published &&
                announcement.publishDate <= now &&
                (
                    !announcement.expiryDate ||
                    announcement.expiryDate >= now
                ) &&
                (
                    announcement.targetAudience === "all" ||
                    announcement.targetAudience === "students"
                );

            if (!isVisible) {
                return res.status(403).json({
                    message: "Access denied"
                });
            }
        }

        res.status(200).json({
            announcement
        });
    } catch (error) {
        console.error(
            "Get announcement error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while fetching announcement"
        });
    }
};

const updateAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid announcement ID"
            });
        }

        const allowedFields = [
            "title",
            "content",
            "category",
            "priority",
            "targetAudience",
            "publishDate",
            "expiryDate",
            "published"
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

        const announcement =
            await Announcement.findByIdAndUpdate(
                id,
                updates,
                {
                    new: true,
                    runValidators: true
                }
            ).populate(
                "createdBy",
                "name email role"
            );

        if (!announcement) {
            return res.status(404).json({
                message: "Announcement not found"
            });
        }

        await logActivity({
            user: req.user.userId,
            action: "UPDATE",
            entity: "Announcement",
            entityId: announcement._id,
            description: `Updated announcement ${announcement.title}`,
            ipAddress: req.ip
        });

        res.status(200).json({
            message: "Announcement updated successfully",
            announcement
        });
    } catch (error) {
        console.error(
            "Update announcement error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while updating announcement"
        });
    }
};

const deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid announcement ID"
            });
        }

        const announcement =
            await Announcement.findByIdAndDelete(id);

        if (!announcement) {
            return res.status(404).json({
                message: "Announcement not found"
            });
        }

        await logActivity({
            user: req.user.userId,
            action: "DELETE",
            entity: "Announcement",
            entityId: announcement._id,
            description: `Deleted announcement ${announcement.title}`,
            ipAddress: req.ip
        });

        res.status(200).json({
            message: "Announcement deleted successfully"
        });
    } catch (error) {
        console.error(
            "Delete announcement error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while deleting announcement"
        });
    }
};

const publishAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid announcement ID"
            });
        }

        const announcement =
            await Announcement.findByIdAndUpdate(
                id,
                {
                    published: true,
                    publishDate: new Date()
                },
                {
                    new: true
                }
            ).populate(
                "createdBy",
                "name email role"
            );

        if (!announcement) {
            return res.status(404).json({
                message: "Announcement not found"
            });
        }

        await logActivity({
            user: req.user.userId,
            action: "PUBLISH",
            entity: "Announcement",
            entityId: announcement._id,
            description: `Published announcement ${announcement.title}`,
            ipAddress: req.ip
        });

        res.status(200).json({
            message: "Announcement published successfully",
            announcement
        });
    } catch (error) {
        console.error(
            "Publish announcement error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while publishing announcement"
        });
    }
};

const unpublishAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid announcement ID"
            });
        }

        const announcement =
            await Announcement.findByIdAndUpdate(
                id,
                {
                    published: false
                },
                {
                    new: true
                }
            ).populate(
                "createdBy",
                "name email role"
            );

        if (!announcement) {
            return res.status(404).json({
                message: "Announcement not found"
            });
        }

        await logActivity({
            user: req.user.userId,
            action: "UNPUBLISH",
            entity: "Announcement",
            entityId: announcement._id,
            description: `Unpublished announcement ${announcement.title}`,
            ipAddress: req.ip
        });

        res.status(200).json({
            message: "Announcement unpublished successfully",
            announcement
        });
    } catch (error) {
        console.error(
            "Unpublish announcement error:",
            error.message
        );

        res.status(500).json({
            message: "Server error while unpublishing announcement"
        });
    }
};

module.exports = {
    createAnnouncement,
    getAnnouncements,
    getAllAnnouncements,
    getAnnouncementById,
    updateAnnouncement,
    deleteAnnouncement,
    publishAnnouncement,
    unpublishAnnouncement
};