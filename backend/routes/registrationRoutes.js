const express = require("express");
const {
    createRegistration,
    listRegistrations,
    updateRegistration
} = require("../controllers/registrationController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const roles = ["examination_cell", "department_admin", "super_admin"];

router.get("/", protect, authorize(...roles), listRegistrations);
router.post("/", protect, authorize(...roles), createRegistration);
router.patch("/:id", protect, authorize(...roles), updateRegistration);

module.exports = router;
