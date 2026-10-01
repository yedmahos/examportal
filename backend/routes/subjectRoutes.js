const express = require("express");
const {
    createSubject,
    listSubjects,
    getSubject,
    updateSubject,
    verifySubject
} = require("../controllers/subjectController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const managers = ["examination_cell", "super_admin"];
const readers = [...managers, "department_admin"];

router.get("/", protect, authorize(...readers), listSubjects);
router.get("/:id", protect, authorize(...readers), getSubject);
router.post("/", protect, authorize(...managers), createSubject);
router.put("/:id", protect, authorize(...managers), updateSubject);
router.patch("/:id/verification", protect, authorize("department_admin", "super_admin"), verifySubject);

module.exports = router;
