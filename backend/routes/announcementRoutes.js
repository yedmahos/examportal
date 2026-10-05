const express = require("express");

const {
    createAnnouncement,
    getAnnouncements,
    getAllAnnouncements,
    getAnnouncementById,
    updateAnnouncement,
    deleteAnnouncement,
    publishAnnouncement,
    unpublishAnnouncement
} = require("../controllers/announcementController");

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");
const { GROUPS } = require("../utils/roles");

const router = express.Router();

// ========================================
// GET ACTIVE ANNOUNCEMENTS
// Students and admins
// ========================================

router.get(
    "/",
    protect,
    getAnnouncements
);

// ========================================
// GET ALL ANNOUNCEMENTS
// Admin only
// IMPORTANT: Must come before /:id
// ========================================

router.get(
    "/all",
    protect,
    authorize(...GROUPS.announcementManagers),
    getAllAnnouncements
);

// ========================================
// CREATE ANNOUNCEMENT
// Admin only
// ========================================

router.post(
    "/",
    protect,
    authorize(...GROUPS.announcementManagers),
    createAnnouncement
);

// ========================================
// UPDATE ANNOUNCEMENT
// Admin only
// ========================================

router.put(
    "/:id",
    protect,
    authorize(...GROUPS.announcementManagers),
    updateAnnouncement
);

// ========================================
// DELETE ANNOUNCEMENT
// Admin only
// ========================================

router.delete(
    "/:id",
    protect,
    authorize(...GROUPS.announcementManagers),
    deleteAnnouncement
);

// ========================================
// PUBLISH ANNOUNCEMENT
// Admin only
// ========================================

router.patch(
    "/:id/publish",
    protect,
    authorize(...GROUPS.announcementManagers),
    publishAnnouncement
);

// ========================================
// UNPUBLISH ANNOUNCEMENT
// Admin only
// ========================================

router.patch(
    "/:id/unpublish",
    protect,
    authorize(...GROUPS.announcementManagers),
    unpublishAnnouncement
);

// ========================================
// GET SINGLE ANNOUNCEMENT
// Admin and student
// IMPORTANT: Keep this AFTER /all
// ========================================

router.get(
    "/:id",
    protect,
    getAnnouncementById
);

module.exports = router;