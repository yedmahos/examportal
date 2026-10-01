const express = require("express");
const {
    createBatch,
    listBatches,
    getBatch,
    updateBatch
} = require("../controllers/academicController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const readRoles = ["super_admin", "department_admin", "examination_cell"];
const writeRoles = ["super_admin"];

router.get("/", protect, authorize(...readRoles), listBatches);
router.get("/:id", protect, authorize(...readRoles), getBatch);
router.post("/", protect, authorize(...writeRoles), createBatch);
router.put("/:id", protect, authorize(...writeRoles), updateBatch);

module.exports = router;
