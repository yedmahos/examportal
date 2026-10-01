const express = require("express");
const {
    createAcademicYear,
    listAcademicYears,
    getAcademicYear,
    updateAcademicYear
} = require("../controllers/academicController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const readRoles = ["super_admin", "department_admin", "examination_cell"];
const writeRoles = ["super_admin"];

router.get("/", protect, authorize(...readRoles), listAcademicYears);
router.get("/:id", protect, authorize(...readRoles), getAcademicYear);
router.post("/", protect, authorize(...writeRoles), createAcademicYear);
router.put("/:id", protect, authorize(...writeRoles), updateAcademicYear);

module.exports = router;
