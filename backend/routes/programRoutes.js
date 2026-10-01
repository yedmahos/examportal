const express = require("express");
const {
    createProgram,
    listPrograms,
    getProgram,
    updateProgram
} = require("../controllers/academicController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const readRoles = ["super_admin", "department_admin", "examination_cell"];
const writeRoles = ["super_admin"];

router.get("/", protect, authorize(...readRoles), listPrograms);
router.get("/:id", protect, authorize(...readRoles), getProgram);
router.post("/", protect, authorize(...writeRoles), createProgram);
router.put("/:id", protect, authorize(...writeRoles), updateProgram);

module.exports = router;
