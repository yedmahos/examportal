const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Department = require("../models/Department");
const { isObjectId, invalidId, handleError } = require("../utils/http");

const createFaculty = async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters"
            });
        }

        const existing = await User.findOne({ email });

        if (existing) {
            return res.status(409).json({
                message: "User with this email already exists"
            });
        }

        let departmentRef;

        if (req.body.department) {
            if (!isObjectId(req.body.department)) return invalidId(res, "department id");

            const department = await Department.findById(req.body.department);

            if (!department) {
                return res.status(404).json({ message: "Department not found" });
            }

            departmentRef = department._id;
        }

        const created = await User.create({
            name,
            email,
            password: await bcrypt.hash(password, 12),
            role: "faculty",
            departmentRef,
            phone: req.body.phone ? String(req.body.phone).trim() : undefined,
            status: "active"
        });

        const user = await User.findById(created._id)
            .select("-password")
            .populate("departmentRef", "name code");

        res.status(201).json({
            message: "Faculty account created",
            user
        });
    } catch (error) {
        return handleError(res, error, "Create faculty error:");
    }
};

const listFaculty = async (req, res) => {
    try {
        const items = await User.find({ role: { $in: ["faculty", "department_admin"] } })
            .select("-password")
            .populate("departmentRef", "name code")
            .sort({ role: 1, name: 1 });

        res.status(200).json({ items });
    } catch (error) {
        return handleError(res, error, "List faculty error:");
    }
};

const assignDepartment = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "user id");
        if (!isObjectId(req.body.department)) return invalidId(res, "department id");

        const department = await Department.findById(req.body.department);
        if (!department) return res.status(404).json({ message: "Department not found" });

        const user = await User.findOne({
            _id: req.params.id,
            role: { $in: ["faculty", "department_admin"] }
        });

        if (!user) {
            return res.status(404).json({ message: "Faculty or department admin not found" });
        }

        user.departmentRef = department._id;
        await user.save();

        const item = await User.findById(user._id)
            .select("-password")
            .populate("departmentRef", "name code");

        res.status(200).json({
            message: "Department assignment saved",
            user: item
        });
    } catch (error) {
        return handleError(res, error, "Assign department error:");
    }
};

const STAFF_ROLES = ["department_admin", "examination_cell", "super_admin"];

const createStaff = async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");
        const role = String(req.body.role || "").trim();

        if (!name || !email || !password || !role) {
            return res.status(400).json({
                message: "Name, email, password and role are required"
            });
        }

        if (!STAFF_ROLES.includes(role)) {
            return res.status(400).json({
                message: "Role must be department_admin, examination_cell, or super_admin"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters"
            });
        }

        const existing = await User.findOne({ email });

        if (existing) {
            return res.status(409).json({
                message: "User with this email already exists"
            });
        }

        let departmentRef;

        if (role === "department_admin") {
            if (!isObjectId(req.body.department)) {
                return res.status(400).json({ message: "Department Admin requires a department" });
            }

            const department = await Department.findById(req.body.department);

            if (!department) {
                return res.status(404).json({ message: "Department not found" });
            }

            departmentRef = department._id;
        }

        const created = await User.create({
            name,
            email,
            password: await bcrypt.hash(password, 12),
            role,
            departmentRef,
            status: "active"
        });

        const user = await User.findById(created._id)
            .select("-password")
            .populate("departmentRef", "name code");

        res.status(201).json({
            message: "Staff account created",
            user
        });
    } catch (error) {
        return handleError(res, error, "Create staff error:");
    }
};

module.exports = {
    createFaculty,
    listFaculty,
    assignDepartment,
    createStaff
};
