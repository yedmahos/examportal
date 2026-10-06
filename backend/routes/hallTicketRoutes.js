const express = require("express");
const { download } = require("../controllers/hallTicketController");
const { protect } = require("../middleware/authMiddleware");
const { roleSatisfies } = require("../utils/roles");

const router = express.Router();

router.get("/:scheduleId", protect, (req, res, next) => {
    if (!roleSatisfies(req.user.role, ["student"])) {
        return res.status(403).json({ message: "Access denied." });
    }
    return next();
}, download);

module.exports = router;
