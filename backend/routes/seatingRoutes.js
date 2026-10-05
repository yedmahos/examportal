const express = require("express");
const {
    preview,
    createPlan,
    regeneratePlan,
    getBySchedule,
    getPlan,
    getRoom,
    mySeat,
    deletePlan
} = require("../controllers/seatingController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const managers = ["examination_cell", "super_admin", "department_admin"];

router.post("/preview", protect, authorize(...managers), preview);
router.post("/regenerate", protect, authorize(...managers), regeneratePlan);
router.get("/student/me", protect, authorize("student"), mySeat);
router.get("/schedule/:scheduleId", protect, authorize(...managers), getBySchedule);
router.get("/:id/rooms/:roomId", protect, authorize(...managers), getRoom);
router.get("/:id", protect, authorize(...managers), getPlan);
router.post("/", protect, authorize(...managers), createPlan);
router.delete("/:id", protect, authorize(...managers), deletePlan);

module.exports = router;
