const express = require("express");
const {
    createExamType,
    listExamTypes,
    updateExamType,
    setExamTypeStatus
} = require("../controllers/examTypeController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const roles = ["examination_cell", "super_admin"];

router.get("/", protect, authorize(...roles, "department_admin"), listExamTypes);
router.post("/", protect, authorize(...roles), createExamType);
router.put("/:id", protect, authorize(...roles), updateExamType);
router.patch("/:id/status", protect, authorize(...roles), setExamTypeStatus);

module.exports = router;
