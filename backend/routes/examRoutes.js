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

const router = express.Router();

// View all exams
router.get("/", protect, getAllExams);

// View single exam
router.get("/:id", protect, getExamById);

// Create exam
router.post(
    "/",
    protect,
    authorize("admin"),
    createExam
);

// Update exam
router.put(
    "/:id",
    protect,
    authorize("admin"),
    updateExam
);

// Archive exam
router.delete(
    "/:id",
    protect,
    authorize("admin"),
    deleteExam
);

module.exports = router;