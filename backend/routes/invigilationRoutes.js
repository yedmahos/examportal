const express = require("express");
const {
    preview,
    create,
    bulk,
    generate,
    bySchedule,
    mine,
    forFaculty,
    listWorkload,
    update,
    remove,
    saveAvailability,
    getAvailability
} = require("../controllers/invigilationController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const managers = ["examination_cell", "super_admin"];
const readers = [...managers, "department_admin"];

router.post("/preview", protect, authorize(...managers), preview);
router.post("/bulk", protect, authorize(...managers), bulk);
router.post("/generate", protect, authorize(...readers), generate);
router.get("/faculty/me", protect, authorize("faculty"), mine);
router.get("/faculty/:facultyId", protect, authorize("faculty", "department_admin", "examination_cell"), forFaculty);
router.get("/workload", protect, authorize(...readers), listWorkload);
router.get("/availability", protect, authorize("faculty", "department_admin", "examination_cell"), getAvailability);
router.put("/availability", protect, authorize("faculty", "examination_cell", "super_admin"), saveAvailability);
router.get("/schedule/:scheduleId", protect, authorize(...readers), bySchedule);
router.post("/", protect, authorize(...managers), create);
router.put("/:id", protect, authorize(...managers), update);
router.delete("/:id", protect, authorize(...managers), remove);

module.exports = router;
