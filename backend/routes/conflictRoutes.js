const express = require("express");
const { checkConflicts } = require("../controllers/conflictController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
    "/check",
    protect,
    authorize("examination_cell", "super_admin", "department_admin"),
    checkConflicts
);

module.exports = router;
