const express = require("express");
const {
    createSchedule,
    listSchedules,
    getSchedule,
    updateSchedule,
    deleteSchedule,
    mySchedules,
    previewSchedule
} = require("../controllers/scheduleController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const managers = ["examination_cell", "super_admin"];
const readers = [...managers, "department_admin"];

router.get("/mine", protect, authorize("student"), mySchedules);
router.post("/preview", protect, authorize(...managers), previewSchedule);
router.get("/", protect, authorize(...readers), listSchedules);
router.get("/:id", protect, authorize(...readers, "student"), getSchedule);
router.post("/", protect, authorize(...managers), createSchedule);
router.put("/:id", protect, authorize(...managers), updateSchedule);
router.delete("/:id", protect, authorize(...managers), deleteSchedule);

module.exports = router;
