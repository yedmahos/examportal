const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Department = require("../models/Department");
const { isObjectId, invalidId, handleError } = require("../utils/http");
const { ASSIGNABLE_ROLES } = require("../utils/roles");

const STAFF_ROLES = ["faculty", "department_admin", "examination_cell", "super_admin"];

const rejectSelf = (req, userId, message) => {
    if (String(req.user.userId) === String(userId)) {
        const error = new Error(message);
        error.status = 403;
        throw error;
    }
};

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

const publicUser = (id) => {
    return User.findById(id).select("-password").populate("departmentRef", "name code");
};

const loadDepartment = async (departmentId, required) => {
    if (!departmentId) {
        if (!required) return undefined;
        const error = new Error("Department Admin requires a department");
        error.status = 400;
        throw error;
    }

    if (!isObjectId(departmentId)) {
        const error = new Error("Invalid department id");
        error.status = 400;
        throw error;
    }

    const department = await Department.findById(departmentId);

    if (!department) {
        const error = new Error("Department not found");
        error.status = 404;
        throw error;
    }

    return department._id;
};

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

        if (!ASSIGNABLE_ROLES.includes(role)) {
            return res.status(400).json({
                message: "Role must be faculty, department_admin, examination_cell, or super_admin"
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

        const departmentRef = await loadDepartment(req.body.department, role === "department_admin");
        const created = await User.create({
            name,
            email,
            password: await bcrypt.hash(password, 12),
            role,
            departmentRef,
            phone: req.body.phone ? String(req.body.phone).trim() : undefined,
            status: "active"
        });
        const user = await publicUser(created._id);

        res.status(201).json({
            message: "Account created",
            user
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        return handleError(res, error, "Create staff account error:");
    }
};

const listStaff = async (req, res) => {
    try {
        const items = await User.find({ role: { $in: STAFF_ROLES } })
            .select("-password")
            .populate("departmentRef", "name code")
            .sort({ role: 1, name: 1 });

        res.status(200).json({ items });
    } catch (error) {
        return handleError(res, error, "List staff error:");
    }
};

const assignRole = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "user id");
        rejectSelf(req, req.params.id, "You cannot change your own role");

        const role = String(req.body.role || "").trim();

        if (!ASSIGNABLE_ROLES.includes(role)) {
            return res.status(400).json({
                message: "Role must be faculty, department_admin, examination_cell, or super_admin"
            });
        }

        const user = await User.findById(req.params.id);

        if (!user || user.role === "student") {
            return res.status(404).json({ message: "Staff account not found" });
        }

        if (role === "department_admin" && !user.departmentRef && !req.body.department) {
            return res.status(400).json({ message: "Department Admin requires a department" });
        }

        if (req.body.department) {
            user.departmentRef = await loadDepartment(req.body.department, true);
        }

        user.role = role;
        await user.save();

        res.status(200).json({
            message: "Role assignment saved",
            user: await publicUser(user._id)
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        return handleError(res, error, "Assign role error:");
    }
};

const setAccountStatus = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "user id");
        rejectSelf(req, req.params.id, "You cannot change your own status");

        const status = String(req.body.status || "").trim();

        if (!["active", "inactive"].includes(status)) {
            return res.status(400).json({ message: "Status must be active or inactive" });
        }

        const user = await User.findById(req.params.id);

        if (!user || user.role === "student") {
            return res.status(404).json({ message: "Staff account not found" });
        }

        user.status = status;
        await user.save();

        res.status(200).json({
            message: "Account status saved",
            user: await publicUser(user._id)
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        return handleError(res, error, "Set account status error:");
    }
};

const assignDepartment = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "user id");
        rejectSelf(req, req.params.id, "You cannot assign your own department");
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

module.exports = {
    createFaculty,
    listFaculty,
    assignDepartment,
    createStaff,
    listStaff,
    assignRole,
    setAccountStatus
};
