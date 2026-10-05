const express = require("express");

const {
    getAllStudents,
    getStudentById,
    createStudent,
    updateStudent,
    updateStudentStatus
} = require("../controllers/studentController");

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");

const router = express.Router();

const { GROUPS } = require("../utils/roles");

const studentManagers = GROUPS.studentManagers;

router.get(
    "/",
    protect,
    authorize(...studentManagers),
    getAllStudents
);

router.post(
    "/",
    protect,
    authorize(...studentManagers),
    createStudent
);

router.get(
    "/:id",
    protect,
    authorize(...studentManagers),
    getStudentById
);

router.put(
    "/:id",
    protect,
    authorize(...studentManagers),
    updateStudent
);

router.patch(
    "/:id/status",
    protect,
    authorize(...studentManagers),
    updateStudentStatus
);

module.exports = router;