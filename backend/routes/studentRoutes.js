const express = require("express");

const {
    getAllStudents,
    getStudentById,
    updateStudent,
    updateStudentStatus
} = require("../controllers/studentController");

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");

const router = express.Router();

// All student management routes are admin only

router.get(
    "/",
    protect,
    authorize("admin"),
    getAllStudents
);

router.get(
    "/:id",
    protect,
    authorize("admin"),
    getStudentById
);

router.put(
    "/:id",
    protect,
    authorize("admin"),
    updateStudent
);

router.patch(
    "/:id/status",
    protect,
    authorize("admin"),
    updateStudentStatus
);

module.exports = router;