/**
 * Development demo-account and session checks.
 * Uses in-memory MongoDB and does not touch a remote database.
 */
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const express = require("express");

process.env.JWT_SECRET = process.env.JWT_SECRET || "demo-account-check";

const User = require("../models/User");
const { ensureCatalog } = require("../services/catalogSeed");
const { DEMO_ACCOUNTS, seedAllowed, upsertDemoAccounts } = require("../services/demoAccounts");
const { planMigration } = require("../services/roleMigration");

const app = express();
app.use(express.json());
app.use("/api/auth", require("../routes/authRoutes"));
app.use("/api/users", require("../routes/userRoutes"));
app.use("/api/profile", require("../routes/profileRoutes"));
app.use("/api/departments", require("../routes/departmentRoutes"));
app.use("/api/schedules", require("../routes/scheduleRoutes"));
app.use("/api/seating-plans", require("../routes/seatingRoutes"));

const results = [];
const check = (name, condition, detail = "") => {
    results.push({ name, ok: Boolean(condition), detail });
    if (!condition) console.error("FAIL", name, detail);
};

const request = async (method, urlPath, { token, body } = {}) => {
    const response = await fetch(`http://127.0.0.1:${port}${urlPath}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });
    let data = null;
    try { data = await response.json(); } catch { data = null; }
    return { status: response.status, data };
};

let port = 0;

const run = async () => {
    const missing = seedAllowed("", "");
    const remote = seedAllowed("mongodb+srv://user:secret@cluster.example.net/exam", "");
    const local = seedAllowed("mongodb://127.0.0.1:27017/examportal", "");
    const confirmed = seedAllowed("mongodb+srv://user:secret@cluster.example.net/exam", "development");
    check("missing database is not seeded", missing.allowed === false && missing.message === "DATABASE SEED NOT EXECUTED", missing.message);
    check(
        "remote database is refused without explicit confirmation",
        remote.allowed === false && remote.message.startsWith("Production database detected"),
        remote.message
    );
    check("local database is accepted", local.allowed === true, local.message);
    check("explicit development confirmation allows a remote seed", confirmed.allowed === true, confirmed.message);

    const { MongoMemoryServer } = require("/tmp/mongotest/node_modules/mongodb-memory-server");
    const memory = await MongoMemoryServer.create();
    await mongoose.connect(memory.getUri());
    await ensureCatalog();
    const first = await upsertDemoAccounts();
    const second = await upsertDemoAccounts();
    const emails = DEMO_ACCOUNTS.map((account) => account.email);
    const counts = await Promise.all(emails.map((email) => User.countDocuments({ email })));
    check(
        "demo seed is idempotent",
        first.accounts.length === 5
            && second.accounts.every((account) => account.action === "updated")
            && counts.every((count) => count === 1),
        JSON.stringify({ first: first.accounts, counts })
    );

    const tokens = {};
    for (const account of DEMO_ACCOUNTS) {
        const login = await request("POST", "/api/auth/login", {
            body: { email: account.email, password: account.password }
        });
        tokens[account.role] = login.data?.token;
        const stored = await User.findOne({ email: account.email }).select("role status departmentRef");
        check(
            `${account.role} demo login`,
            login.status === 200
                && login.data.user.role === account.role
                && stored.role === account.role
                && stored.status === "active"
                && !JSON.stringify(login.data).includes(account.password),
            JSON.stringify({ status: login.status, role: login.data?.user?.role, message: login.data?.message })
        );
    }

    const departmentAdmin = await User.findOne({ email: "department.admin@example.com" });
    check("department admin has departmentRef", Boolean(departmentAdmin.departmentRef), String(departmentAdmin.departmentRef));

    const homes = {
        student: "/student/dashboard",
        faculty: "/faculty/dashboard",
        department_admin: "/department-admin/dashboard",
        examination_cell: "/examination-cell/dashboard",
        super_admin: "/super-admin/dashboard"
    };
    const { roleHome } = await import("../../frontend/src/utils/roles.js");
    check(
        "authenticated role selects the dashboard",
        DEMO_ACCOUNTS.every((account) => roleHome(account.role) === homes[account.role]),
        ""
    );

    for (const role of ["faculty", "department_admin", "examination_cell", "super_admin", "admin"]) {
        const registered = await request("POST", "/api/auth/register", {
            body: {
                name: `Claim ${role}`,
                email: `claim-${role}@example.com`,
                password: "password123",
                role
            }
        });
        check(
            `registration cannot create ${role}`,
            registered.status === 201 && registered.data.user.role === "student",
            JSON.stringify(registered.data?.user)
        );
    }

    const studentSchedule = await request("POST", "/api/schedules", { token: tokens.student, body: {} });
    const facultySchedule = await request("POST", "/api/schedules", { token: tokens.faculty, body: {} });
    const studentSeat = await request("POST", "/api/seating-plans", { token: tokens.student, body: {} });
    const facultySeat = await request("POST", "/api/seating-plans", { token: tokens.faculty, body: {} });
    check("student and faculty cannot create schedules or seating", studentSchedule.status === 403 && facultySchedule.status === 403 && studentSeat.status === 403 && facultySeat.status === 403, JSON.stringify({ studentSchedule: studentSchedule.status, facultySchedule: facultySchedule.status, studentSeat: studentSeat.status, facultySeat: facultySeat.status }));

    const staffBody = { name: "Blocked", email: "blocked-demo@example.com", password: "password123", role: "super_admin" };
    const staffDenied = {};
    for (const role of ["student", "faculty", "department_admin", "examination_cell"]) {
        staffDenied[role] = await request("POST", "/api/users/staff", { token: tokens[role], body: staffBody });
    }
    const staffAllowed = await request("POST", "/api/users/staff", {
        token: tokens.super_admin,
        body: { name: "Extra Faculty", email: "extra-faculty-demo@example.com", password: "password123", role: "faculty", department: departmentAdmin.departmentRef }
    });
    check(
        "only super admin can create staff",
        Object.values(staffDenied).every((response) => response.status === 403) && staffAllowed.status === 201,
        JSON.stringify({ denied: Object.fromEntries(Object.entries(staffDenied).map(([role, response]) => [role, response.status])), allowed: staffAllowed.status })
    );

    const superUser = await User.findOne({ email: "super.admin@example.com" });
    const selfRole = await request("PATCH", `/api/users/${superUser._id}/role`, { token: tokens.super_admin, body: { role: "faculty" } });
    const selfDepartment = await request("PATCH", `/api/users/${departmentAdmin._id}/department`, { token: tokens.department_admin, body: { department: departmentAdmin.departmentRef } });
    const selfStatus = await request("PATCH", `/api/users/${superUser._id}/status`, { token: tokens.super_admin, body: { status: "inactive" } });
    check("users cannot change their own role, department, or status", selfRole.status === 403 && selfDepartment.status === 403 && selfStatus.status === 403, JSON.stringify({ selfRole: selfRole.status, selfDepartment: selfDepartment.status, selfStatus: selfStatus.status }));

    const student = await User.findOne({ email: "student@example.com" });
    const forged = jwt.sign({ userId: student._id.toString(), role: "super_admin" }, process.env.JWT_SECRET);
    const forgedCall = await request("POST", "/api/users/staff", { token: forged, body: staffBody });
    check("forged JWT cannot elevate a student", forgedCall.status === 403, String(forgedCall.status));

    student.role = "faculty";
    await student.save();
    const changedLogin = await request("POST", "/api/auth/login", {
        body: { email: "student@example.com", password: "Student@12345" }
    });
    const changedProfile = await request("GET", "/api/profile", { token: changedLogin.data.token });
    const oldPermission = await request("POST", "/api/schedules", { token: changedLogin.data.token, body: {} });
    check(
        "role change is read from the database on the next login",
        changedLogin.status === 200
            && changedLogin.data.user.role === "faculty"
            && changedProfile.data.user.role === "faculty"
            && oldPermission.status === 403,
        JSON.stringify({ login: changedLogin.data?.user?.role, profile: changedProfile.data?.user?.role, schedule: oldPermission.status })
    );

    student.status = "inactive";
    student.role = "student";
    await student.save();
    const inactiveLogin = await request("POST", "/api/auth/login", {
        body: { email: "student@example.com", password: "Student@12345" }
    });
    const inactiveApi = await request("GET", "/api/profile", { token: forged });
    check("inactive user cannot login or call a protected API", inactiveLogin.status === 403 && inactiveApi.status === 401, JSON.stringify({ login: inactiveLogin.status, api: inactiveApi.status }));

    const migration = planMigration([{ _id: "1", email: "admin@example.com", role: "admin" }], {});
    check(
        "legacy migration does not guess or delete",
        migration.deletes === 0 && migration.changes[0].action === "explicit assignment required",
        JSON.stringify(migration.changes)
    );

    const failed = results.filter((item) => !item.ok);
    console.log(`DEMO_ACCOUNT_CHECKS ${results.length - failed.length}/${results.length}`);
    failed.forEach((item) => console.log(" -", item.name, item.detail));
    await mongoose.disconnect();
    await memory.stop();
    process.exit(failed.length ? 1 : 0);
};

const server = app.listen(0, async () => {
    port = server.address().port;
    try {
        await run();
    } catch (error) {
        console.error(error);
        process.exit(1);
    } finally {
        server.close();
    }
});
