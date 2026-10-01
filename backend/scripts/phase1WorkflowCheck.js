/**
 * End-to-end Phase 1 check against MongoDB.
 * Uses MONGODB_URI when set, otherwise an in-memory server if available.
 */
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const express = require("express");

process.env.JWT_SECRET = process.env.JWT_SECRET || "phase1-check-secret";

const User = require("../models/User");
const { ensureCatalog } = require("../services/catalogSeed");

const tokenFor = (user) => jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET
);

const startMemory = async () => {
    const { MongoMemoryServer } = require("/tmp/mongotest/node_modules/mongodb-memory-server");
    const server = await MongoMemoryServer.create();
    return server;
};

const app = express();
app.use(express.json());

const mount = (prefix, routes) => app.use(prefix, routes);

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
mount("/api/conflicts", require("../routes/conflictRoutes"));
mount("/api/rooms", require("../routes/roomRoutes"));
mount("/api/exams", require("../routes/examRoutes"));
mount("/api/dashboard", require("../routes/dashboardRoutes"));

const results = [];

const check = (name, condition, detail = "") => {
    results.push({ name, ok: Boolean(condition), detail });
    if (!condition) {
        console.error("FAIL", name, detail);
    }
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
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    return { status: response.status, data };
};

let port = 0;

const run = async () => {
    let memory = null;
    const uri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;

    if (uri && !process.env.USE_MEMORY) {
        await mongoose.connect(uri);
    } else {
        memory = await startMemory();
        await mongoose.connect(memory.getUri());
    }

    await ensureCatalog();

    const password = await bcrypt.hash("password123", 4);
    const createUser = (fields) => User.create({
        password,
        status: "active",
        ...fields
    });

    const superAdmin = await createUser({
        name: "Super Admin",
        email: "super@example.com",
        role: "super_admin"
    });
    const examCell = await createUser({
        name: "Exam Cell",
        email: "cell@example.com",
        role: "examination_cell"
    });
    const deptAdmin = await createUser({
        name: "Dept Admin",
        email: "dept@example.com",
        role: "department_admin"
    });
    const faculty = await createUser({
        name: "Faculty",
        email: "faculty@example.com",
        role: "faculty"
    });
    const legacy = await createUser({
        name: "Legacy Admin",
        email: "legacy@example.com",
        role: "admin"
    });
    const studentA = await createUser({
        name: "Student A",
        email: "a@example.com",
        role: "student",
        studentId: "A1"
    });
    const studentB = await createUser({
        name: "Student B",
        email: "b@example.com",
        role: "student",
        studentId: "B1"
    });

    const tokens = {
        super: tokenFor(superAdmin),
        cell: tokenFor(examCell),
        dept: tokenFor(deptAdmin),
        faculty: tokenFor(faculty),
        legacy: tokenFor(legacy),
        a: tokenFor(studentA),
        b: tokenFor(studentB)
    };

    const server = await new Promise((resolve) => {
        const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });
    port = server.address().port;

    const unauth = await request("GET", "/api/departments");
    check("unauthenticated is 401", unauth.status === 401, String(unauth.status));

    const studentDepts = await request("GET", "/api/departments", { token: tokens.a });
    check("student cannot list departments", studentDepts.status === 403, String(studentDepts.status));

    const facultyRooms = await request("GET", "/api/rooms", { token: tokens.faculty });
    check("faculty cannot list rooms", facultyRooms.status === 403, String(facultyRooms.status));

    const year = await request("POST", "/api/academic-years", {
        token: tokens.super,
        body: { name: "2026-2027", startDate: "2026-07-01", endDate: "2027-06-30", isActive: true }
    });
    check("create academic year", year.status === 201, JSON.stringify(year.data));

    const dupYear = await request("POST", "/api/academic-years", {
        token: tokens.super,
        body: { name: "2026-2027", startDate: "2026-07-01", endDate: "2027-06-30" }
    });
    check("duplicate academic year is 409", dupYear.status === 409, String(dupYear.status));

    const deptDenied = await request("POST", "/api/departments", {
        token: tokens.cell,
        body: { name: "Computing", code: "CSE" }
    });
    check("exam cell cannot create department", deptDenied.status === 403, String(deptDenied.status));

    const dept = await request("POST", "/api/departments", {
        token: tokens.legacy,
        body: { name: "Computing", code: "CSE" }
    });
    check("legacy admin can create department", dept.status === 201, JSON.stringify(dept.data));

    const program = await request("POST", "/api/programs", {
        token: tokens.super,
        body: { name: "BSc Computing", code: "BSC", department: dept.data.item._id, duration: 4 }
    });
    check("create program", program.status === 201, JSON.stringify(program.data));

    const batch = await request("POST", "/api/batches", {
        token: tokens.super,
        body: {
            name: "Batch 2026",
            academicYear: year.data.item._id,
            program: program.data.item._id,
            semester: 6
        }
    });
    check("create batch", batch.status === 201, JSON.stringify(batch.data));

    const section = await request("POST", "/api/sections", {
        token: tokens.super,
        body: { name: "A", batch: batch.data.item._id }
    });
    check("create section", section.status === 201, JSON.stringify(section.data));

    const types = await request("GET", "/api/exam-types?limit=50", { token: tokens.cell });
    const typeNames = (types.data.items || []).map((item) => item.name);
    check("built-in exam types exist", typeNames.includes("End Semester") && typeNames.includes("Viva"), typeNames.join(","));

    const customType = await request("POST", "/api/exam-types", {
        token: tokens.cell,
        body: { name: "Class Test", code: "CT", description: "Short class test" }
    });
    check("custom exam type", customType.status === 201 && customType.data.item.isCustom === true);

    const sessions = await request("GET", "/api/sessions?limit=20", { token: tokens.cell });
    const morning = (sessions.data.items || []).find((item) => item.code === "MORNING");
    const afternoon = (sessions.data.items || []).find((item) => item.code === "AFTERNOON");
    check("morning and afternoon sessions", Boolean(morning && afternoon));

    const evening = await request("POST", "/api/sessions", {
        token: tokens.cell,
        body: {
            name: "Evening",
            code: "EVENING",
            reportingTime: "17:30",
            startTime: "18:00",
            endTime: "20:00",
            duration: 120
        }
    });
    check("custom session", evening.status === 201, JSON.stringify(evening.data));

    const subject = await request("POST", "/api/subjects", {
        token: tokens.cell,
        body: {
            code: "CSE601",
            name: "Distributed Systems",
            subjectType: "theory",
            department: dept.data.item._id,
            program: program.data.item._id,
            semester: 6,
            duration: 180
        }
    });
    check("create subject", subject.status === 201, JSON.stringify(subject.data));

    const elective = await request("POST", "/api/subjects", {
        token: tokens.cell,
        body: {
            code: "CSE690",
            name: "Elective Graphics",
            subjectType: "elective",
            department: dept.data.item._id,
            program: program.data.item._id,
            semester: 6,
            duration: 120
        }
    });
    check("create elective", elective.status === 201);

    const subjectTwo = await request("POST", "/api/subjects", {
        token: tokens.cell,
        body: {
            code: "CSE602",
            name: "Networks",
            subjectType: "theory",
            department: dept.data.item._id,
            program: program.data.item._id,
            semester: 6,
            duration: 180
        }
    });

    const verifyDenied = await request("PATCH", `/api/subjects/${subject.data.item._id}/verification`, {
        token: tokens.cell,
        body: { verificationStatus: "verified" }
    });
    check("exam cell cannot verify subject", verifyDenied.status === 403, String(verifyDenied.status));

    const verified = await request("PATCH", `/api/subjects/${subject.data.item._id}/verification`, {
        token: tokens.dept,
        body: { verificationStatus: "verified" }
    });
    check("department admin verifies subject", verified.status === 200 && verified.data.item.verificationStatus === "verified");

    const enrollA = await request("POST", "/api/enrollments", {
        token: tokens.dept,
        body: {
            student: studentA._id,
            program: program.data.item._id,
            batch: batch.data.item._id,
            section: section.data.item._id,
            academicYear: year.data.item._id,
            semester: 6
        }
    });
    check("enroll student A", enrollA.status === 201, JSON.stringify(enrollA.data));

    const enrollB = await request("POST", "/api/enrollments", {
        token: tokens.cell,
        body: {
            student: studentB._id,
            program: program.data.item._id,
            batch: batch.data.item._id,
            section: section.data.item._id,
            academicYear: year.data.item._id,
            semester: 6
        }
    });
    check("enroll student B", enrollB.status === 201);

    const regA = await request("POST", "/api/registrations", {
        token: tokens.cell,
        body: {
            student: studentA._id,
            subject: subject.data.item._id,
            academicYear: year.data.item._id,
            semester: 6,
            registrationStatus: "registered"
        }
    });
    check("register student A", regA.status === 201);

    await request("POST", "/api/registrations", {
        token: tokens.cell,
        body: {
            student: studentA._id,
            subject: subjectTwo.data.item._id,
            academicYear: year.data.item._id,
            semester: 6
        }
    });
    await request("POST", "/api/registrations", {
        token: tokens.cell,
        body: {
            student: studentA._id,
            subject: elective.data.item._id,
            academicYear: year.data.item._id,
            semester: 6
        }
    });
    await request("POST", "/api/registrations", {
        token: tokens.cell,
        body: {
            student: studentB._id,
            subject: subjectTwo.data.item._id,
            academicYear: year.data.item._id,
            semester: 6
        }
    });

    const examination = await request("POST", "/api/exams", {
        token: tokens.cell,
        body: {
            examinationSetup: true,
            title: "End Semester 2026",
            examType: types.data.items.find((item) => item.code === "END")._id,
            academicYear: year.data.item._id,
            department: dept.data.item._id,
            program: program.data.item._id,
            semester: 6,
            startDate: "2026-10-01",
            endDate: "2026-10-31",
            reportingTime: "08:30",
            sessions: [morning._id, afternoon._id],
            eligibleBatches: [batch.data.item._id],
            instructions: "Bring the admit card."
        }
    });
    check("create examination", examination.status === 201, JSON.stringify(examination.data));
    check(
        "examination keeps legacy names from references",
        examination.data.exam.department === "Computing" && examination.data.exam.subject === undefined,
        JSON.stringify({
            department: examination.data.exam?.department,
            subject: examination.data.exam?.subject
        })
    );

    const legacyExam = await request("POST", "/api/exams", {
        token: tokens.legacy,
        body: {
            title: "Notice only",
            subject: "Old Subject",
            department: "Computing",
            program: "BSc Computing",
            semester: 6,
            academicYear: "2026-2027",
            examDate: "2026-11-01",
            startTime: "09:00",
            endTime: "12:00",
            venue: "Hall 1",
            duration: 180
        }
    });
    check("legacy exam notice still creates", legacyExam.status === 201, JSON.stringify(legacyExam.data));

    const eligibility = await request("POST", "/api/eligibility/calculate", {
        token: tokens.cell,
        body: { examination: examination.data.exam._id, subject: subject.data.item._id }
    });
    check("calculate eligibility", eligibility.status === 200, JSON.stringify(eligibility.data?.counts));
    check(
        "registered and blocked buckets",
        eligibility.data.counts.registered === 1 && eligibility.data.counts.blocked === 1,
        JSON.stringify(eligibility.data.counts)
    );

    const blocked = (eligibility.data.records || []).find((item) => item.eligibilityStatus === "blocked");
    check("blocked student has a reason", Boolean(blocked?.reason), blocked?.reason || "");

    const room = await request("POST", "/api/rooms", {
        token: tokens.cell,
        body: {
            roomNumber: "101",
            building: "Block A",
            floor: "1",
            capacity: 40,
            roomType: "hall",
            facilities: ["projector"]
        }
    });
    check("create room", room.status === 201, JSON.stringify(room.data));

    const tiny = await request("POST", "/api/rooms", {
        token: tokens.super,
        body: { roomNumber: "1", building: "Annex", floor: "0", capacity: 1, roomType: "classroom" }
    });

    const schedule = await request("POST", "/api/schedules", {
        token: tokens.cell,
        body: {
            examination: examination.data.exam._id,
            subject: subject.data.item._id,
            date: "2026-10-02",
            session: morning._id,
            room: room.data.item._id,
            status: "scheduled"
        }
    });
    check("valid schedule saved", schedule.status === 201, JSON.stringify(schedule.data));
    check(
        "schedule stores session reporting time",
        schedule.data.item.reportingTime === "08:30",
        schedule.data.item?.reportingTime
    );

    const duplicate = await request("POST", "/api/schedules", {
        token: tokens.cell,
        body: {
            examination: examination.data.exam._id,
            subject: subject.data.item._id,
            date: "2026-10-03",
            session: afternoon._id,
            room: room.data.item._id,
            status: "scheduled"
        }
    });
    check("duplicate subject blocked", duplicate.status === 409, JSON.stringify(duplicate.data));

    await request("POST", "/api/eligibility/calculate", {
        token: tokens.cell,
        body: { examination: examination.data.exam._id, subject: subjectTwo.data.item._id }
    });

    const overlap = await request("POST", "/api/schedules", {
        token: tokens.cell,
        body: {
            examination: examination.data.exam._id,
            subject: subjectTwo.data.item._id,
            date: "2026-10-02",
            session: morning._id,
            room: tiny.data.item._id,
            status: "scheduled"
        }
    });
    const overlapTypes = (overlap.data.conflicts || []).map((item) => item.type);
    check(
        "student and batch conflicts block overlapping paper",
        overlap.status === 409 && overlapTypes.includes("student") && overlapTypes.includes("batch"),
        JSON.stringify(overlap.data)
    );

    const capacity = await request("POST", "/api/conflicts/check", {
        token: tokens.dept,
        body: {
            examination: examination.data.exam._id,
            subject: subjectTwo.data.item._id,
            date: "2026-10-04",
            session: afternoon._id,
            room: tiny.data.item._id
        }
    });
    check(
        "insufficient capacity is blocking",
        (capacity.data.conflicts || []).some((item) => item.type === "room" && item.severity === "blocking"),
        JSON.stringify(capacity.data)
    );

    const roomClash = await request("POST", "/api/conflicts/check", {
        token: tokens.cell,
        body: {
            examination: examination.data.exam._id,
            subject: subjectTwo.data.item._id,
            date: "2026-10-02",
            session: morning._id,
            room: room.data.item._id
        }
    });
    check(
        "room conflict detected",
        (roomClash.data.conflicts || []).some((item) => item.message.includes("already allocated")),
        JSON.stringify(roomClash.data)
    );

    await request("POST", "/api/eligibility/calculate", {
        token: tokens.cell,
        body: { examination: examination.data.exam._id, subject: elective.data.item._id }
    });

    const afternoonPaper = await request("POST", "/api/schedules", {
        token: tokens.cell,
        body: {
            examination: examination.data.exam._id,
            subject: elective.data.item._id,
            date: "2026-10-02",
            session: afternoon._id,
            room: room.data.item._id,
            status: "scheduled"
        }
    });
    check("non-overlapping afternoon schedule saved", afternoonPaper.status === 201, JSON.stringify(afternoonPaper.data));

    const eveningPaper = await request("POST", "/api/schedules", {
        token: tokens.cell,
        body: {
            examination: examination.data.exam._id,
            subject: subjectTwo.data.item._id,
            date: "2026-10-02",
            session: evening.data.item._id,
            room: room.data.item._id,
            status: "draft"
        }
    });
    const density = (eveningPaper.data.conflicts || eveningPaper.data.item?.warnings || []);
    check(
        "third paper on the same date warns about density or is blocked by capacity",
        eveningPaper.status === 409 || eveningPaper.status === 201,
        JSON.stringify({ status: eveningPaper.status, conflicts: eveningPaper.data.conflicts, warnings: eveningPaper.data.item?.warnings })
    );
    if (eveningPaper.status === 201) {
        check(
            "density warning stored",
            (eveningPaper.data.conflicts || []).some((item) => item.type === "density" && item.severity === "warning"),
            JSON.stringify(eveningPaper.data.conflicts)
        );
    } else {
        check(
            "tiny room blocked the third paper",
            (eveningPaper.data.conflicts || []).some((item) => item.severity === "blocking"),
            JSON.stringify(eveningPaper.data.conflicts)
        );
    }

    const mineA = await request("GET", "/api/schedules/mine", { token: tokens.a });
    check(
        "student A sees applicable schedules",
        mineA.status === 200 && (mineA.data.items || []).some((item) => item.subject?.code === "CSE601"),
        JSON.stringify(mineA.data.items?.map((item) => item.subject?.code))
    );
    const first = mineA.data.items?.[0];
    check(
        "student schedule includes session, reporting time and room",
        Boolean(first?.session?.startTime && first?.reportingTime && first?.room?.building),
        JSON.stringify(first)
    );

    const mineB = await request("GET", "/api/schedules/mine", { token: tokens.b });
    const bCodes = (mineB.data.items || []).map((item) => item.subject?.code);
    check("student B does not see student A only paper", !bCodes.includes("CSE601"), bCodes.join(","));

    const hidden = await request("GET", `/api/schedules/${schedule.data.item._id}`, { token: tokens.b });
    check("other student cannot open the schedule", hidden.status === 403, String(hidden.status));

    const deptReview = await request("GET", "/api/schedules", { token: tokens.dept });
    check("department admin can review schedules", deptReview.status === 200, String(deptReview.status));

    const deptSave = await request("POST", "/api/schedules", {
        token: tokens.dept,
        body: {
            examination: examination.data.exam._id,
            subject: subjectTwo.data.item._id,
            date: "2026-10-10",
            session: morning._id,
            room: room.data.item._id,
            status: "scheduled"
        }
    });
    check("department admin cannot save schedules", deptSave.status === 403, String(deptSave.status));

    const dashboard = await request("GET", "/api/dashboard/admin", { token: tokens.cell });
    check(
        "dashboard metrics are numeric",
        dashboard.status === 200
            && typeof dashboard.data.statistics.totalSubjects === "number"
            && typeof dashboard.data.statistics.subjectsScheduled === "number"
            && typeof dashboard.data.statistics.totalRooms === "number"
            && typeof dashboard.data.statistics.conflicts === "number",
        JSON.stringify(dashboard.data?.statistics)
    );
    check(
        "current examination is the real record",
        dashboard.data.statistics.currentExamination?.title === "End Semester 2026",
        dashboard.data.statistics.currentExamination?.title
    );

    const failed = results.filter((item) => !item.ok);
    console.log(`PHASE1_CHECKS ${results.length - failed.length}/${results.length}`);
    failed.forEach((item) => console.log(" -", item.name, item.detail));

    server.close();
    await mongoose.disconnect();
    if (memory) await memory.stop();
    process.exit(failed.length ? 1 : 0);
};

run().catch(async (error) => {
    console.error(error);
    process.exit(1);
});
