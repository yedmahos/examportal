const express = require("express");

const {
    createResult,
    getAllResults,
    getMyResults,
    getResultById,
    updateResult,
    publishResult,
    unpublishResult
} = require("../controllers/resultController");

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");

const router = express.Router();

// Student
router.get(
    "/my",
    protect,
    authorize("student"),
    getMyResults
);

// Admin
router.get(
    "/",
    protect,
    authorize("admin"),
    getAllResults
);

router.post(
    "/",
    protect,
    authorize("admin"),
    createResult
);

router.put(
    "/:id",
    protect,
    authorize("admin"),
    updateResult
);

router.patch(
    "/:id/publish",
    protect,
    authorize("admin"),
    publishResult
);

router.patch(
    "/:id/unpublish",
    protect,
    authorize("admin"),
    unpublishResult
);

// Both admin and student with ownership checks
router.get(
    "/:id",
    protect,
    getResultById
);

module.exports = router;