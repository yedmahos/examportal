const express = require("express");
const {
    createSession,
    listSessions,
    updateSession
} = require("../controllers/sessionController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const roles = ["examination_cell", "super_admin"];

router.get("/", protect, authorize(...roles, "department_admin"), listSessions);
router.post("/", protect, authorize(...roles), createSession);
router.put("/:id", protect, authorize(...roles), updateSession);

module.exports = router;
