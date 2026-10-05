const express = require("express");

const {
    createExam,
    getAllExams,
    getExamById,
    updateExam,
    deleteExam
} = require("../controllers/examController");

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");
const { GROUPS } = require("../utils/roles");

const router = express.Router();

// View all exams
router.get("/", protect, getAllExams);

// View single exam
router.get("/:id", protect, getExamById);

// Create exam
router.post(
    "/",
    protect,
    authorize(...GROUPS.examManagers),
    createExam
);

// Update exam
router.put(
    "/:id",
    protect,
    authorize(...GROUPS.examManagers),
    updateExam
);

// Archive exam
router.delete(
    "/:id",
    protect,
    authorize(...GROUPS.examManagers),
    deleteExam
);

module.exports = router;