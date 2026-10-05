const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Department = require("../models/Department");

const DEMO_ACCOUNTS = [
    {
        name: "Demo Student",
        email: "student@example.com",
        password: "Student@12345",
        role: "student",
        studentId: "DEMO-STUDENT",
        department: "Demo Department",
        program: "Demo Program",
        semester: 1,
        academicYear: "2026-2027"
    },
    {
        name: "Demo Faculty",
        email: "faculty@example.com",
        password: "Faculty@12345",
        role: "faculty"
    },
    {
        name: "Demo Department Admin",
        email: "department.admin@example.com",
        password: "DepartmentAdmin@12345",
        role: "department_admin"
    },
    {
        name: "Demo Examination Cell",
        email: "examination.cell@example.com",
        password: "ExaminationCell@12345",
        role: "examination_cell"
    },
    {
        name: "Demo Super Admin",
        email: "super.admin@example.com",
        password: "SuperAdmin@12345",
        role: "super_admin"
    }
];

const databaseTarget = (uri) => {
    if (!uri) return "missing";

    if (/localhost|127\.0\.0\.1/i.test(uri)) {
        return "development";
    }

    return "remote";
};

const seedAllowed = (uri, confirmation) => {
    const target = databaseTarget(uri);

    if (target === "missing") {
        return { allowed: false, target, message: "DATABASE SEED NOT EXECUTED" };
    }

    if (target !== "development" && confirmation !== "development") {
        return {
            allowed: false,
            target,
            message: "Production database detected. Demo account provisioning requires explicit confirmation."
        };
    }

    return { allowed: true, target, message: "Development database accepted" };
};

const ensureDemoDepartment = async () => {
    const existing = await Department.findOne({ code: "DEMO" });

    if (existing) return existing;

    return Department.create({
        name: "Demo Department",
        code: "DEMO",
        status: "active"
    });
};

const upsertDemoAccounts = async () => {
    const department = await ensureDemoDepartment();
    const results = [];

    for (const account of DEMO_ACCOUNTS) {
        const email = account.email.toLowerCase();
        const password = await bcrypt.hash(account.password, 12);
        const fields = {
            name: account.name,
            role: account.role,
            status: "active",
            password
        };

        if (account.role === "student") {
            fields.studentId = account.studentId;
            fields.department = account.department;
            fields.program = account.program;
            fields.semester = account.semester;
            fields.academicYear = account.academicYear;
            fields.departmentRef = undefined;
        }

        if (account.role === "faculty" || account.role === "department_admin") {
            fields.departmentRef = department._id;
        }

        const existing = await User.findOne({ email });

        if (existing) {
            Object.assign(existing, fields);
            await existing.save();
            results.push({ email, role: existing.role, action: "updated" });
        } else {
            await User.create({ email, ...fields });
            results.push({ email, role: account.role, action: "created" });
        }
    }

    return {
        department: { id: department._id, name: department.name, code: department.code },
        accounts: results
    };
};

module.exports = {
    DEMO_ACCOUNTS,
    databaseTarget,
    seedAllowed,
    upsertDemoAccounts
};
