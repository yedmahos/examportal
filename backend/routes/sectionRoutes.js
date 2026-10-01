const express = require("express");
const {
    createSection,
    listSections,
    getSection,
    updateSection
} = require("../controllers/academicController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const readRoles = ["super_admin", "department_admin", "examination_cell"];
const writeRoles = ["super_admin"];

router.get("/", protect, authorize(...readRoles), listSections);
router.get("/:id", protect, authorize(...readRoles), getSection);
router.post("/", protect, authorize(...writeRoles), createSection);
router.put("/:id", protect, authorize(...writeRoles), updateSection);

module.exports = router;
