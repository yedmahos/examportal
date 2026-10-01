const express = require("express");
const {
    createRoom,
    listRooms,
    getRoom,
    updateRoom,
    roomAvailability
} = require("../controllers/roomController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const roles = ["examination_cell", "super_admin"];

router.get("/", protect, authorize(...roles), listRooms);
router.get("/:id/availability", protect, authorize(...roles), roomAvailability);
router.get("/:id", protect, authorize(...roles), getRoom);
router.post("/", protect, authorize(...roles), createRoom);
router.put("/:id", protect, authorize(...roles), updateRoom);

module.exports = router;
