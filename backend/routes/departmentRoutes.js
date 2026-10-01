const express = require("express");
const {
    createDepartment,
    listDepartments,
    getDepartment,
    updateDepartment
} = require("../controllers/academicController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const readRoles = ["super_admin", "department_admin", "examination_cell"];
const writeRoles = ["super_admin"];

router.get("/", protect, authorize(...readRoles), listDepartments);
router.get("/:id", protect, authorize(...readRoles), getDepartment);
router.post("/", protect, authorize(...writeRoles), createDepartment);
router.put("/:id", protect, authorize(...writeRoles), updateDepartment);

module.exports = router;
