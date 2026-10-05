const express = require("express");

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");
const {
    createFaculty,
    listFaculty,
    assignDepartment,
    createStaff,
    listStaff,
    assignRole,
    setAccountStatus
} = require("../controllers/facultyController");

const router = express.Router();

router.get(
    "/faculty",
    protect,
    authorize("super_admin"),
    listFaculty
);

router.post(
    "/faculty",
    protect,
    authorize("super_admin"),
    createFaculty
);

router.get(
    "/staff",
    protect,
    authorize("super_admin"),
    listStaff
);

router.post(
    "/staff",
    protect,
    authorize("super_admin"),
    createStaff
);

router.patch(
    "/:id/role",
    protect,
    authorize("super_admin"),
    assignRole
);

router.patch(
    "/:id/status",
    protect,
    authorize("super_admin"),
    setAccountStatus
);

router.patch(
    "/:id/department",
    protect,
    authorize("super_admin"),
    assignDepartment
);

// Any authenticated user
router.get("/me", protect, (req, res) => {
    res.json({
        message: "Authentication successful",
        user: req.user
    });
});

// Student only
router.get(
    "/student-only",
    protect,
    authorize("student"),
    (req, res) => {
        res.json({
            message: "Student access granted",
            user: req.user
        });
    }
);

// Legacy probe. Super Admin satisfies it; a generic admin grant is not required.
router.get(
    "/admin-only",
    protect,
    authorize("super_admin"),
    (req, res) => {
        res.json({
            message: "Admin access granted",
            user: req.user
        });
    }
);

module.exports = router;