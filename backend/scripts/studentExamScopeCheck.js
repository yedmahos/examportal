/**
 * Student exam visibility is limited to ExamEligibility rows
 * with status eligible or registered for the authenticated student.
 */
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const express = require("express");

process.env.JWT_SECRET = process.env.JWT_SECRET || "student-exam-scope-check";

const User = require("../models/User");
const Exam = require("../models/Exam");
const ExamEligibility = require("../models/ExamEligibility");
const Schedule = require("../models/Schedule");

const tokenFor = (user) => jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET
);

const app = express();
app.use(express.json());
app.use("/api/exams", require("../routes/examRoutes"));
app.use("/api/schedules", require("../routes/scheduleRoutes"));
app.use("/api/dashboard", require("../routes/dashboardRoutes"));
app.use("/api/hall-tickets", require("../routes/hallTicketRoutes"));

const results = [];
const check = (name, condition, detail = "") => {
    results.push({ name, ok: Boolean(condition), detail });
    if (!condition) console.error("FAIL", name, detail);
    else console.log("OK", name);
};

const request = async (method, urlPath, { token } = {}) => {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`http://127.0.0.1:${port}${urlPath}`, { method, headers });
    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }
    return { status: response.status, data };
};

const titles = (payload) => (payload?.exams || []).map((exam) => exam.title).sort();

let port;
let server;
let memory;

const run = async () => {
    const { MongoMemoryServer } = require("/tmp/mongotest/node_modules/mongodb-memory-server");
    memory = await MongoMemoryServer.create();
    await mongoose.connect(memory.getUri());

    server = await new Promise((resolve) => {
        const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });
    port = server.address().port;

    const subjectA = new mongoose.Types.ObjectId();
    const subjectB = new mongoose.Types.ObjectId();
    const subjectC = new mongoose.Types.ObjectId();
    const session = new mongoose.Types.ObjectId();

    const [studentA, studentB, studentNone, faculty, cell] = await User.create([
        { name: "Student A", email: "scope-a@example.com", password: "secret", role: "student", status: "active" },
        { name: "Student B", email: "scope-b@example.com", password: "secret", role: "student", status: "active" },
        { name: "Student None", email: "scope-none@example.com", password: "secret", role: "student", status: "active" },
        { name: "Faculty", email: "scope-faculty@example.com", password: "secret", role: "faculty", status: "active" },
        { name: "Exam Cell", email: "scope-cell@example.com", password: "secret", role: "examination_cell", status: "active" }
    ]);

    const [mid, midsems, extra] = await Exam.create([
        { title: "MID", subject: "BDA", examCode: "MAN1102", semester: 5, status: "scheduled", createdBy: cell._id },
        { title: "MIDSEMS", subject: "COA", examCode: "COA", semester: 5, status: "scheduled", venue: "Auditorium Hall B", room: "104", createdBy: cell._id },
        { title: "EXTRA", subject: "PHY", examCode: "PHY101", semester: 1, status: "scheduled", createdBy: cell._id }
    ]);

    await ExamEligibility.create([
        { student: studentA._id, examination: mid._id, subject: subjectA, eligibilityStatus: "eligible", examRegistrationStatus: "not_registered" },
        { student: studentA._id, examination: extra._id, subject: subjectC, eligibilityStatus: "registered", examRegistrationStatus: "registered" },
        { student: studentA._id, examination: midsems._id, subject: subjectB, eligibilityStatus: "blocked", examRegistrationStatus: "not_registered" },
        { student: studentB._id, examination: midsems._id, subject: subjectB, eligibilityStatus: "registered", examRegistrationStatus: "registered" }
    ]);

    const future = new Date("2026-10-08T00:00:00.000Z");
    const [scheduleA] = await Schedule.create([
        {
            examination: mid._id,
            subject: subjectA,
            date: future,
            session,
            duration: 180,
            reportingTime: "08:30",
            status: "scheduled",
            eligibleStudents: [studentA._id],
            createdBy: cell._id
        },
        {
            examination: midsems._id,
            subject: subjectB,
            date: future,
            session,
            duration: 180,
            reportingTime: "09:00",
            status: "scheduled",
            eligibleStudents: [studentB._id],
            createdBy: cell._id
        },
        {
            examination: midsems._id,
            subject: subjectB,
            date: new Date("2020-01-01T00:00:00.000Z"),
            session,
            duration: 180,
            reportingTime: "09:00",
            status: "scheduled",
            eligibleStudents: [studentA._id],
            createdBy: cell._id
        }
    ]);

    const tokenA = tokenFor(studentA);
    const tokenB = tokenFor(studentB);
    const tokenNone = tokenFor(studentNone);
    const tokenFaculty = tokenFor(faculty);
    const tokenCell = tokenFor(cell);

    const listA = await request("GET", "/api/exams?studentId=" + studentB._id.toString(), { token: tokenA });
    check("unregistered eligibility is hidden and studentId is ignored", listA.status === 200 && titles(listA.data).join(",") === "EXTRA", titles(listA.data).join(","));

    const listB = await request("GET", "/api/exams", { token: tokenB });
    check("student B sees only MIDSEMS", listB.status === 200 && titles(listB.data).join(",") === "MIDSEMS", titles(listB.data).join(","));

    const listNone = await request("GET", "/api/exams", { token: tokenNone });
    check("student with no eligibility gets an empty list", listNone.status === 200 && titles(listNone.data).length === 0 && listNone.data.total === 0, JSON.stringify(listNone.data));

    const searchOther = await request("GET", "/api/exams?search=MIDSEMS", { token: tokenA });
    check("student search cannot reveal another exam", searchOther.status === 200 && titles(searchOther.data).length === 0);

    const detailOwn = await request("GET", `/api/exams/${extra._id}`, { token: tokenA });
    check("student can open a registered exam", detailOwn.status === 200 && detailOwn.data.exam.title === "EXTRA");

    const detailUnregistered = await request("GET", `/api/exams/${mid._id}`, { token: tokenA });
    check("eligible but unregistered exam is denied", detailUnregistered.status === 403);

    const detailOther = await request("GET", `/api/exams/${midsems._id}`, { token: tokenA });
    check("student cannot open an unrelated exam", detailOther.status === 403);

    const detailBlocked = await request("GET", `/api/exams/${midsems._id}?studentId=${studentB._id}`, { token: tokenA });
    check("blocked eligibility stays denied", detailBlocked.status === 403);

    const facultyList = await request("GET", "/api/exams", { token: tokenFaculty });
    check("faculty list stays unscoped", facultyList.status === 200 && titles(facultyList.data).join(",") === "EXTRA,MID,MIDSEMS", titles(facultyList.data).join(","));

    const cellList = await request("GET", "/api/exams", { token: tokenCell });
    check("examination cell list stays unscoped", cellList.status === 200 && titles(cellList.data).length === 3);

    const mineA = await request("GET", "/api/schedules/mine", { token: tokenA });
    const mineATitles = (mineA.data?.items || []).map((item) => String(item.examination?.title || item.examination));
    check("my schedule keeps only eligible papers", mineA.status === 200 && mineATitles.length === 1 && mineATitles[0] === "MID", mineATitles.join(","));

    const mineB = await request("GET", `/api/schedules/${scheduleA._id}`, { token: tokenB });
    check("other student cannot open the schedule", mineB.status === 403);

    const hall = await request("GET", `/api/hall-tickets/${scheduleA._id}`, { token: tokenB });
    check("hall ticket stays denied for the other student", hall.status === 403, String(hall.status));

    const ownHall = await request("GET", `/api/hall-tickets/${scheduleA._id}`, { token: tokenA });
    check("eligible hall ticket is not an authorization denial", ownHall.status !== 403, String(ownHall.status));

    const dash = await request("GET", "/api/dashboard/student", { token: tokenA });
    const dashTitles = (dash.data?.upcomingExams || []).map((item) => item.title);
    check("dashboard upcoming stays on the student schedule", dash.status === 200 && dashTitles.length === 1 && dashTitles[0] === "MID", dashTitles.join(","));

    const failed = results.filter((item) => !item.ok);
    if (failed.length) {
        console.error(JSON.stringify(failed, null, 2));
        process.exitCode = 1;
    }
};

run()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (server) await new Promise((resolve) => server.close(resolve));
        await mongoose.disconnect().catch(() => {});
        if (memory) await memory.stop().catch(() => {});
    });
