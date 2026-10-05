/**
 * PRD role authentication and authorization checks.
 * Uses an in-memory MongoDB server and does not touch production data.
 */
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const express = require("express");

process.env.JWT_SECRET = process.env.JWT_SECRET || "role-auth-check";

const User = require("../models/User");
const Enrollment = require("../models/Enrollment");
const SubjectRegistration = require("../models/SubjectRegistration");
const RoomAllocation = require("../models/RoomAllocation");
const { ensureCatalog } = require("../services/catalogSeed");
const { planMigration } = require("../services/roleMigration");

const app = express();
app.use(express.json());
const mount = (prefix, routes) => app.use(prefix, routes);
mount("/api/auth", require("../routes/authRoutes"));
mount("/api/users", require("../routes/userRoutes"));
mount("/api/profile", require("../routes/profileRoutes"));
mount("/api/academic-years", require("../routes/academicYearRoutes"));
mount("/api/departments", require("../routes/departmentRoutes"));
mount("/api/programs", require("../routes/programRoutes"));
mount("/api/batches", require("../routes/batchRoutes"));
mount("/api/sections", require("../routes/sectionRoutes"));
mount("/api/exam-types", require("../routes/examTypeRoutes"));
mount("/api/sessions", require("../routes/sessionRoutes"));
mount("/api/subjects", require("../routes/subjectRoutes"));
mount("/api/enrollments", require("../routes/enrollmentRoutes"));
mount("/api/registrations", require("../routes/registrationRoutes"));
mount("/api/eligibility", require("../routes/eligibilityRoutes"));
mount("/api/schedules", require("../routes/scheduleRoutes"));
mount("/api/rooms", require("../routes/roomRoutes"));
mount("/api/room-allocations", require("../routes/roomAllocationRoutes"));
mount("/api/seating-plans", require("../routes/seatingRoutes"));
mount("/api/exams", require("../routes/examRoutes"));

const results = [];
const check = (name, condition, detail = "") => {
    results.push({ name, ok: Boolean(condition), detail });
    if (!condition) console.error("FAIL", name, detail);
};

const request = async (method, urlPath, { token, body } = {}) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`http://127.0.0.1:${port}${urlPath}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    let data = null;
    try { data = await response.json(); } catch { data = null; }
    return { status: response.status, data };
};

let port = 0;

const run = async () => {
    const { MongoMemoryServer } = require("/tmp/mongotest/node_modules/mongodb-memory-server");
    const memory = await MongoMemoryServer.create();
    await mongoose.connect(memory.getUri());
    await ensureCatalog();

    const password = "password123";
    const hashed = await bcrypt.hash(password, 4);
    const accounts = [
        ["Student", "student-role@example.com", "student"],
        ["Faculty", "faculty-role@example.com", "faculty"],
        ["Department Admin", "dept-role@example.com", "department_admin"],
        ["Examination Cell", "cell-role@example.com", "examination_cell"],
        ["Super Admin", "super-role@example.com", "super_admin"]
    ];

    for (const [name, email, role] of accounts) {
        await User.create({ name, email, password: hashed, role, status: "active" });
    }

    const login = async (email) => request("POST", "/api/auth/login", {
        body: { email, password }
    });

    const studentLogin = await login("student-role@example.com");
    const facultyLogin = await login("faculty-role@example.com");
    const deptLogin = await login("dept-role@example.com");
    const cellLogin = await login("cell-role@example.com");
    const superLogin = await login("super-role@example.com");
    check("1 student login", studentLogin.status === 200 && studentLogin.data.user.role === "student", JSON.stringify(studentLogin.data?.user));
    check("2 faculty login", facultyLogin.status === 200 && facultyLogin.data.user.role === "faculty", JSON.stringify(facultyLogin.data?.user));
    check("3 department admin login", deptLogin.status === 200 && deptLogin.data.user.role === "department_admin", JSON.stringify(deptLogin.data?.user));
    check("4 examination cell login", cellLogin.status === 200 && cellLogin.data.user.role === "examination_cell", JSON.stringify(cellLogin.data?.user));
    check("5 super admin login", superLogin.status === 200 && superLogin.data.user.role === "super_admin", JSON.stringify(superLogin.data?.user));

    const student = studentLogin.data.token;
    const faculty = facultyLogin.data.token;
    const dept = deptLogin.data.token;
    const cell = cellLogin.data.token;
    const superToken = superLogin.data.token;
    const superUser = await User.findOne({ email: "super-role@example.com" });

    const studentSchedule = await request("POST", "/api/schedules", { token: student, body: {} });
    const facultySchedule = await request("POST", "/api/schedules", { token: faculty, body: {} });
    check("student cannot create a schedule", studentSchedule.status === 403, String(studentSchedule.status));
    check("faculty cannot create a schedule", facultySchedule.status === 403, String(facultySchedule.status));

    const must = async (name, method, urlPath, body, token = superToken) => {
        const response = await request(method, urlPath, { token, body });
        if (response.status >= 400) throw new Error(`${name} ${response.status} ${JSON.stringify(response.data)}`);
        return response.data;
    };

    const year = (await must("year", "POST", "/api/academic-years", {
        name: "2026-2027", startDate: "2026-06-01", endDate: "2027-05-31"
    })).item;
    const computing = (await must("computing", "POST", "/api/departments", { name: "Computing", code: "COMP" })).item;
    const electrical = (await must("electrical", "POST", "/api/departments", { name: "Electrical", code: "ELEC" })).item;
    const hidden = await request("GET", `/api/departments/${electrical._id}`, { token: dept });
    check(
        "department admin without a department cannot read another department",
        hidden.status === 403,
        JSON.stringify(hidden.data)
    );
    await User.updateOne({ email: "dept-role@example.com" }, { departmentRef: computing._id });
    const ownDepartment = await request("GET", `/api/departments/${computing._id}`, { token: dept });
    const otherDepartment = await request("GET", `/api/departments/${electrical._id}`, { token: dept });
    check(
        "department admin is limited to their department",
        ownDepartment.status === 200 && otherDepartment.status === 403,
        JSON.stringify({ own: ownDepartment.status, other: otherDepartment.status, message: otherDepartment.data })
    );

    const program = (await must("program", "POST", "/api/programs", {
        name: "BSc Computing", code: "BSC", department: computing._id, duration: 4
    })).item;
    const batch = (await must("batch", "POST", "/api/batches", {
        name: "Comp 2026", academicYear: year._id, program: program._id, semester: 6
    })).item;
    const section = (await must("section", "POST", "/api/sections", { name: "A", batch: batch._id })).item;
    const morning = (await must("session", "POST", "/api/sessions", {
        name: "Role Morning", code: "ROLEMORN", reportingTime: "08:30", startTime: "09:00", endTime: "12:00"
    }, cell)).item;
    const types = await request("GET", "/api/exam-types", { token: cell });
    const examType = types.data.items.find((item) => item.code === "END");
    const subject = (await must("subject", "POST", "/api/subjects", {
        code: "ROLE101", name: "Role Subject", subjectType: "theory", department: computing._id,
        program: program._id, semester: 6, duration: 120
    }, cell)).item;
    await must("verify", "PATCH", `/api/subjects/${subject._id}/verification`, { verificationStatus: "verified" });
    const learner = await User.create({
        name: "Learner",
        email: "learner-role@example.com",
        password: hashed,
        role: "student",
        status: "active",
        studentId: "ROLE-1",
        department: "Computing"
    });
    await Enrollment.create({
        student: learner._id, program: program._id, batch: batch._id, section: section._id,
        academicYear: year._id, semester: 6, status: "active"
    });
    await SubjectRegistration.create({
        student: learner._id, subject: subject._id, academicYear: year._id, semester: 6, registrationStatus: "registered"
    });
    const examination = (await must("exam", "POST", "/api/exams", {
        examinationSetup: true, title: "Role Exams", examType: examType._id, academicYear: year._id,
        department: computing._id, program: program._id, semester: 6, startDate: "2026-11-01",
        endDate: "2026-11-30", reportingTime: "08:30", sessions: [morning._id], eligibleBatches: [batch._id],
        instructions: "Bring an identity card."
    }, cell)).exam;
    const schedule = (await must("schedule", "POST", "/api/schedules", {
        examination: examination._id, subject: subject._id, date: "2026-11-12", session: morning._id, status: "draft"
    }, cell)).item;
    const room = (await must("room", "POST", "/api/rooms", {
        roomNumber: "ROLE1", building: "North", floor: "1", capacity: 20, roomType: "classroom", department: computing._id
    }, cell)).item;
    await RoomAllocation.create({
        schedule: schedule._id, room: room._id, allocatedStudents: 1, capacity: room.capacity,
        date: schedule.date, session: schedule.session._id || schedule.session, createdBy: superUser._id
    });
    const cellPreview = await request("POST", "/api/seating-plans/preview", {
        token: cell, body: { schedule: schedule._id, strategy: "ROLL_NUMBER" }
    });
    const cellSave = await request("POST", "/api/seating-plans", {
        token: cell, body: { schedule: schedule._id, strategy: "ROLL_NUMBER" }
    });
    const superPreview = await request("POST", "/api/seating-plans/preview", {
        token: superToken, body: { schedule: schedule._id, strategy: "ROLL_NUMBER" }
    });
    check(
        "examination cell can manage schedules and seating",
        schedule.status === "draft" && cellPreview.status === 200 && cellSave.status === 201 && cellSave.data.seatsAssigned === 1,
        JSON.stringify({ schedule: schedule.status, preview: cellPreview.status, save: cellSave.status, seats: cellSave.data })
    );
    check("super admin can manage seating", superPreview.status === 200 && superPreview.data.existing === true, JSON.stringify(superPreview.data));

    const studentSeat = await request("POST", "/api/seating-plans", {
        token: student, body: { schedule: schedule._id, strategy: "ROLL_NUMBER" }
    });
    const facultySeat = await request("POST", "/api/seating-plans", {
        token: faculty, body: { schedule: schedule._id, strategy: "ROLL_NUMBER" }
    });
    const facultyRead = await request("GET", "/api/seating-plans/faculty/me", { token: faculty });
    const facultyRooms = await request("GET", "/api/room-allocations/faculty/me", { token: faculty });
    const ownSeat = await request("POST", "/api/seating-plans/preview", {
        token: dept, body: { schedule: schedule._id, strategy: "ROLL_NUMBER" }
    });
    const otherAdmin = await User.create({
        name: "Other Admin", email: "other-role@example.com", password: hashed,
        role: "department_admin", status: "active", departmentRef: electrical._id
    });
    const otherToken = (await login("other-role@example.com")).data.token;
    const otherSeat = await request("POST", "/api/seating-plans/preview", {
        token: otherToken, body: { schedule: schedule._id, strategy: "ROLL_NUMBER" }
    });
    await User.updateOne({ _id: otherAdmin._id }, { departmentRef: computing._id });
    const movedToken = (await login("other-role@example.com")).data.token;
    const movedSeat = await request("POST", "/api/seating-plans/preview", {
        token: movedToken, body: { schedule: schedule._id, strategy: "ROLL_NUMBER" }
    });
    check("student cannot create seating", studentSeat.status === 403, String(studentSeat.status));
    check("faculty cannot create seating and can read only assigned seating", facultySeat.status === 403 && facultyRead.status === 200 && facultyRead.data.items.length === 0 && facultyRooms.status === 200, JSON.stringify({ facultySeat: facultySeat.status, facultyRead: facultyRead.data }));
    check(
        "department admin cannot manage another department's seating",
        ownSeat.status === 200 && otherSeat.status === 403 && movedSeat.status === 200,
        JSON.stringify({ own: ownSeat.status, other: otherSeat.data, moved: movedSeat.status })
    );

    const denied = async (token) => request("POST", "/api/users/staff", {
        token,
        body: { name: "Nope", email: "nope-role@example.com", password: "password123", role: "super_admin" }
    });
    check("examination cell cannot assign roles", (await denied(cell)).status === 403, "");
    check("department admin cannot assign roles", (await denied(dept)).status === 403, "");
    check("faculty cannot assign roles", (await denied(faculty)).status === 403, "");
    check("student cannot assign roles", (await denied(student)).status === 403, "");

    const missingDepartment = await request("POST", "/api/users/staff", {
        token: superToken,
        body: { name: "No Dept", email: "nodept-role@example.com", password: "password123", role: "department_admin" }
    });
    const createdFaculty = await request("POST", "/api/users/staff", {
        token: superToken,
        body: { name: "New Faculty", email: "new-faculty-role@example.com", password: "password123", role: "faculty" }
    });
    const createdCell = await request("POST", "/api/users/staff", {
        token: superToken,
        body: { name: "New Cell", email: "new-cell-role@example.com", password: "password123", role: "examination_cell" }
    });
    const createdSuper = await request("POST", "/api/users/staff", {
        token: superToken,
        body: { name: "New Super", email: "new-super-role@example.com", password: "password123", role: "super_admin" }
    });
    const createdDept = await request("POST", "/api/users/staff", {
        token: superToken,
        body: { name: "New Dept", email: "new-dept-role@example.com", password: "password123", role: "department_admin", department: computing._id }
    });
    check(
        "only super admin can create administrative roles",
        missingDepartment.status === 400
            && createdFaculty.status === 201 && createdFaculty.data.user.role === "faculty"
            && createdCell.status === 201 && createdCell.data.user.role === "examination_cell"
            && createdSuper.status === 201 && createdSuper.data.user.role === "super_admin"
            && createdDept.status === 201 && createdDept.data.user.role === "department_admin",
        JSON.stringify({ missingDepartment: missingDepartment.data, faculty: createdFaculty.status, cell: createdCell.status, super: createdSuper.status, dept: createdDept.status })
    );

    const selfRole = await request("PATCH", `/api/users/${superUser._id}/role`, {
        token: superToken, body: { role: "faculty" }
    });
    const cellRole = await request("PATCH", `/api/users/${createdFaculty.data.user._id}/role`, {
        token: cell, body: { role: "super_admin" }
    });
    const superRole = await request("PATCH", `/api/users/${createdFaculty.data.user._id}/role`, {
        token: superToken, body: { role: "examination_cell" }
    });
    const selfDepartment = await request("PATCH", `/api/users/${superUser._id}/department`, {
        token: superToken, body: { department: computing._id }
    });
    check(
        "users cannot change their own role or department, and only super admin can assign a role",
        selfRole.status === 403 && cellRole.status === 403 && superRole.status === 200 && superRole.data.user.role === "examination_cell" && selfDepartment.status === 403,
        JSON.stringify({ selfRole: selfRole.data, cellRole: cellRole.status, superRole: superRole.data, selfDepartment: selfDepartment.data })
    );

    const registered = await request("POST", "/api/auth/register", {
        body: {
            name: "Claimed Admin", email: "claimed-role@example.com", password: "password123",
            role: "super_admin", studentId: "CLAIM-1"
        }
    });
    const profile = await request("PUT", "/api/profile", {
        token: registered.data.token,
        body: { role: "super_admin", departmentRef: computing._id, name: "Claimed Student" }
    });
    const stored = await User.findOne({ email: "claimed-role@example.com" });
    check(
        "client-supplied role and department do not grant privileges",
        registered.status === 201 && registered.data.user.role === "student"
            && profile.status === 200 && stored.role === "student" && !stored.departmentRef,
        JSON.stringify({ register: registered.data?.user, profile: profile.data?.user, stored: stored.role })
    );

    const forged = jwt.sign({ userId: stored._id.toString(), role: "super_admin" }, process.env.JWT_SECRET);
    const forgedStaff = await request("POST", "/api/users/staff", {
        token: forged,
        body: { name: "Forged", email: "forged-role@example.com", password: "password123", role: "super_admin" }
    });
    check("a modified JWT role does not grant super admin", forgedStaff.status === 403, JSON.stringify(forgedStaff.data));

    await User.updateOne({ _id: stored._id }, { status: "inactive" });
    const inactiveLogin = await request("POST", "/api/auth/login", {
        body: { email: "claimed-role@example.com", password: "password123" }
    });
    const inactiveApi = await request("GET", "/api/users/me", { token: forged });
    check("inactive users cannot authenticate", inactiveLogin.status === 403 && inactiveApi.status === 401, JSON.stringify({ login: inactiveLogin.data, api: inactiveApi.data }));

    const migration = planMigration([
        { _id: "1", email: "admin@example.com", role: "admin" },
        { _id: "2", email: "cell@example.com", role: "examination_cell" },
        { _id: "3", email: "dept@example.com", role: "department_admin" }
    ], {});
    const mapped = planMigration([
        { _id: "1", email: "admin@example.com", role: "admin" },
        { _id: "2", email: "cell@example.com", role: "examination_cell" }
    ], { "admin@example.com": "super_admin", "cell@example.com": "faculty" });
    check(
        "legacy admin migration requires an explicit mapping and does not delete users",
        migration.summary.admin === 1
            && migration.summary.departmentAdminsMissingDepartmentRef.length === 1
            && migration.changes[0].action === "explicit assignment required"
            && migration.deletes === 0
            && mapped.errors.some((item) => item.includes("cell@example.com"))
            && mapped.changes.some((item) => item.to === "super_admin"),
        JSON.stringify({ migration, mapped })
    );

    const failed = results.filter((item) => !item.ok);
    console.log(`ROLE_AUTH_CHECKS ${results.length - failed.length}/${results.length}`);
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
