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
const workflow = require("../controllers/scheduleWorkflowController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const managers = ["examination_cell", "super_admin"];
const readers = [...managers, "department_admin"];

router.get("/mine", protect, authorize("student"), mySchedules);
router.post("/preview", protect, authorize(...managers), previewSchedule);
router.get("/workflow-summary", protect, authorize(...readers), workflow.workflowSummary);
router.get("/", protect, authorize(...readers), listSchedules);

router.get("/:id/versions/compare", protect, authorize(...readers), workflow.compareVersions);
router.get("/:id/versions/:version", protect, authorize(...readers), workflow.getVersion);
router.put("/:id/versions/:version", protect, authorize(...managers), workflow.updateVersion);
router.get("/:id/versions", protect, authorize(...readers), workflow.listVersions);
router.get("/:id/approval", protect, authorize(...readers), workflow.getApproval);
router.get("/:id/impact", protect, authorize(...readers), workflow.getImpact);
router.post("/:id/submit-review", protect, authorize(...managers), workflow.submitReview);
router.post("/:id/verify", protect, authorize("department_admin"), workflow.verifyDepartment);
router.post("/:id/approve", protect, authorize("super_admin"), workflow.approveAcademic);
router.post("/:id/publish", protect, authorize(...managers), workflow.publishVersion);
router.post("/:id/new-version", protect, authorize(...managers), workflow.createNextVersion);
router.post("/:id/return", protect, authorize(...readers), workflow.returnSchedule);

router.get("/:id", protect, authorize(...readers, "student"), getSchedule);
router.post("/", protect, authorize(...managers), createSchedule);
router.put("/:id", protect, authorize(...managers), updateSchedule);
router.delete("/:id", protect, authorize(...managers), deleteSchedule);

module.exports = router;
