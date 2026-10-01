const express = require("express");
const {
    calculate,
    listEligibility,
    updateEligibility
} = require("../controllers/eligibilityController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const readers = ["examination_cell", "department_admin", "super_admin"];

router.get("/", protect, authorize(...readers), listEligibility);
router.post("/calculate", protect, authorize("examination_cell", "super_admin"), calculate);
router.patch("/:id", protect, authorize(...readers), updateEligibility);

module.exports = router;
