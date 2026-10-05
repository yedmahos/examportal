const express = require("express");

const {
    createResult,
    getAllResults,
    getMyResults,
    getResultById,
    updateResult,
    publishResult,
    unpublishResult,
    deleteResult
} = require("../controllers/resultController");

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");
const { GROUPS } = require("../utils/roles");

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
    authorize(...GROUPS.resultManagers),
    getAllResults
);

router.post(
    "/",
    protect,
    authorize(...GROUPS.resultManagers),
    createResult
);

router.put(
    "/:id",
    protect,
    authorize(...GROUPS.resultManagers),
    updateResult
);

router.patch(
    "/:id/publish",
    protect,
    authorize(...GROUPS.resultManagers),
    publishResult
);

router.patch(
    "/:id/unpublish",
    protect,
    authorize(...GROUPS.resultManagers),
    unpublishResult
);

router.delete(
    "/:id",
    protect,
    authorize(...GROUPS.resultManagers),
    deleteResult
);

// Both admin and student with ownership checks
router.get(
    "/:id",
    protect,
    getResultById
);

module.exports = router;