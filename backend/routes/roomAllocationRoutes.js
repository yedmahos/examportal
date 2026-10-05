const express = require("express");
const {
    previewAllocation,
    createAllocation,
    listScheduleAllocations,
    deleteAllocation,
    assignedAllocations
} = require("../controllers/roomAllocationController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const managers = ["examination_cell", "super_admin"];
const readers = [...managers, "department_admin"];

router.get("/faculty/me", protect, authorize("faculty"), assignedAllocations);
router.post("/preview", protect, authorize(...managers), previewAllocation);
router.get("/schedule/:scheduleId", protect, authorize(...readers), listScheduleAllocations);
router.post("/", protect, authorize(...managers), createAllocation);
router.delete("/:id", protect, authorize(...managers), deleteAllocation);

module.exports = router;
