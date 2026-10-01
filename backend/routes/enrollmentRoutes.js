const express = require("express");
const {
    createEnrollment,
    listEnrollments,
    updateEnrollment
} = require("../controllers/enrollmentController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const roles = ["examination_cell", "department_admin", "super_admin"];

router.get("/", protect, authorize(...roles), listEnrollments);
router.post("/", protect, authorize(...roles), createEnrollment);
router.put("/:id", protect, authorize(...roles), updateEnrollment);

module.exports = router;
