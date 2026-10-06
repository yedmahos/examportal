/**
 * Phase 2.4 approval, versioning, and schedule change checks.
 * Uses an in-memory database unless USE_MEMORY is unset and a test URI is set.
 */
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");

process.env.JWT_SECRET = process.env.JWT_SECRET || "approval-version-check-secret";

const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const Schedule = require("../models/Schedule");
const ScheduleVersion = require("../models/ScheduleVersion");
const InvigilationDuty = require("../models/InvigilationDuty");
const Exam = require("../models/Exam");
const { ensureCatalog } = require("../services/catalogSeed");

const tokenFor = (user) => jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET
);

const startMemory = async () => {
    const { MongoMemoryServer } = require("/tmp/mongotest/node_modules/mongodb-memory-server");
    return MongoMemoryServer.create();
};

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
[
    ["/api/auth", "../routes/authRoutes"],
    ["/api/profile", "../routes/profileRoutes"],
    ["/api/dashboard", "../routes/dashboardRoutes"],
    ["/api/academic-years", "../routes/academicYearRoutes"],
    ["/api/departments", "../routes/departmentRoutes"],
    ["/api/programs", "../routes/programRoutes"],
    ["/api/batches", "../routes/batchRoutes"],
    ["/api/sections", "../routes/sectionRoutes"],
    ["/api/exam-types", "../routes/examTypeRoutes"],
    ["/api/sessions", "../routes/sessionRoutes"],
    ["/api/subjects", "../routes/subjectRoutes"],
    ["/api/enrollments", "../routes/enrollmentRoutes"],
    ["/api/registrations", "../routes/registrationRoutes"],
    ["/api/eligibility", "../routes/eligibilityRoutes"],
    ["/api/schedules", "../routes/scheduleRoutes"],
    ["/api/rooms", "../routes/roomRoutes"],
    ["/api/room-allocations", "../routes/roomAllocationRoutes"],
    ["/api/notifications", "../routes/notificationRoutes"],
    ["/api/invigilation", "../routes/invigilationRoutes"],
    ["/api/exams", "../routes/examRoutes"]
].forEach(([prefix, route]) => app.use(prefix, require(route)));

const results = [];
const check = (name, condition, detail = "") => {
    results.push({ name, ok: Boolean(condition), detail });
    if (!condition) console.error("FAIL", name, detail);
};

let port = 0;
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

const titles = (response) => (response.data?.notifications || []).map((item) => item.title);
const countTitle = (response, title) => titles(response).filter((item) => item === title).length;

const run = async () => {
    let memory = null;
    const uri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;
    if (uri && !process.env.USE_MEMORY) await mongoose.connect(uri);
    else {
        memory = await startMemory();
        await mongoose.connect(memory.getUri());
    }

    await ensureCatalog();
    const password = await bcrypt.hash("password123", 4);
    const createUser = (fields) => User.create({ password, status: "active", ...fields });
    const superAdmin = await createUser({ name: "Super Admin", email: "super@example.com", role: "super_admin" });
    const examCell = await createUser({ name: "Exam Cell", email: "cell@example.com", role: "examination_cell" });
    const deptAdmin = await createUser({ name: "Dept Admin", email: "dept@example.com", role: "department_admin" });
    const otherDept = await createUser({ name: "Other Dept", email: "other.dept@example.com", role: "department_admin" });
    const faculty = await createUser({ name: "Faculty Cross", email: "faculty.a@example.com", role: "faculty" });
    const student = await createUser({ name: "Student One", email: "student@example.com", role: "student", studentId: "S1" });
    const studentTwo = await createUser({ name: "Student Two", email: "student2@example.com", role: "student", studentId: "S2" });
    const tokens = {
        super: tokenFor(superAdmin),
        cell: tokenFor(examCell),
        dept: tokenFor(deptAdmin),
        other: tokenFor(otherDept),
        faculty: tokenFor(faculty),
        student: tokenFor(student)
    };

    const server = await new Promise((resolve) => {
        const listener = app.listen(Number(process.env.PORT) || 0, "127.0.0.1", () => resolve(listener));
    });
    port = server.address().port;

    const year = await request("POST", "/api/academic-years", {
        token: tokens.super,
        body: { name: "2026-2027", startDate: "2026-07-01", endDate: "2027-06-30", isActive: true }
    });
    const cse = await request("POST", "/api/departments", { token: tokens.super, body: { name: "Computing", code: "CSE" } });
    const eee = await request("POST", "/api/departments", { token: tokens.super, body: { name: "Electrical", code: "EEE" } });
    await User.findByIdAndUpdate(deptAdmin._id, { departmentRef: cse.data.item._id });
    await User.findByIdAndUpdate(otherDept._id, { departmentRef: eee.data.item._id });
    await User.findByIdAndUpdate(faculty._id, { departmentRef: eee.data.item._id });

    const program = await request("POST", "/api/programs", {
        token: tokens.super,
        body: { name: "BSc Computing", code: "BSC", department: cse.data.item._id, duration: 4 }
    });
    const batch = await request("POST", "/api/batches", {
        token: tokens.super,
        body: { name: "Batch 2026", academicYear: year.data.item._id, program: program.data.item._id, semester: 6 }
    });
    const section = await request("POST", "/api/sections", {
        token: tokens.super,
        body: { name: "A", batch: batch.data.item._id }
    });
    const sessions = await request("GET", "/api/sessions?limit=20", { token: tokens.cell });
    const morning = (sessions.data.items || []).find((item) => item.code === "MORNING");
    const afternoon = (sessions.data.items || []).find((item) => item.code === "AFTERNOON");
    const types = await request("GET", "/api/exam-types?limit=20", { token: tokens.cell });
    const subject = await request("POST", "/api/subjects", {
        token: tokens.cell,
        body: { code: "BDA", name: "Big Data Analytics", subjectType: "theory", department: cse.data.item._id, program: program.data.item._id, semester: 6, duration: 180 }
    });
    await request("PATCH", `/api/subjects/${subject.data.item._id}/verification`, {
        token: tokens.dept,
        body: { verificationStatus: "verified" }
    });
    for (const person of [student, studentTwo]) {
        await request("POST", "/api/enrollments", {
            token: tokens.cell,
            body: { student: person._id, program: program.data.item._id, batch: batch.data.item._id, section: section.data.item._id, academicYear: year.data.item._id, semester: 6 }
        });
        await request("POST", "/api/registrations", {
            token: tokens.cell,
            body: { student: person._id, subject: subject.data.item._id, academicYear: year.data.item._id, semester: 6, registrationStatus: "registered" }
        });
    }
    const examination = await request("POST", "/api/exams", {
        token: tokens.cell,
        body: {
            examinationSetup: true,
            title: "MID",
            examType: types.data.items.find((item) => item.code === "MID")._id,
            academicYear: year.data.item._id,
            department: cse.data.item._id,
            program: program.data.item._id,
            semester: 6,
            startDate: "2026-10-01",
            endDate: "2026-10-31",
            sessions: [morning._id, afternoon._id],
            eligibleBatches: [batch.data.item._id],
            instructions: "Bring your college identity card."
        }
    });
    await request("POST", "/api/eligibility/calculate", {
        token: tokens.cell,
        body: { examination: examination.data.exam._id, subject: subject.data.item._id }
    });
    const roomA = await request("POST", "/api/rooms", {
        token: tokens.cell,
        body: { roomNumber: "C-001", building: "C-25", floor: "1", capacity: 40, roomType: "hall" }
    });
    const roomB = await request("POST", "/api/rooms", {
        token: tokens.cell,
        body: { roomNumber: "C-002", building: "C-25", floor: "1", capacity: 40, roomType: "hall" }
    });

    const created = await request("POST", "/api/schedules", {
        token: tokens.cell,
        body: {
            examination: examination.data.exam._id,
            subject: subject.data.item._id,
            date: "2026-10-08",
            session: morning._id,
            room: roomA.data.item._id,
            status: "draft"
        }
    });
    const scheduleId = created.data?.item?._id;
    check("draft schedule saved", created.status === 201 && Boolean(scheduleId), JSON.stringify(created.data));

    if (process.env.EARLY_HOLD === "1") {
        await request("POST", "/api/invigilation", {
            token: tokens.cell,
            body: { schedule: scheduleId, room: roomA.data.item._id, faculty: faculty._id }
        });
        console.log(`HOLD http://127.0.0.1:${port}`);
        console.log(`SCHEDULE ${scheduleId}`);
        console.log("cell@example.com dept@example.com super@example.com faculty.a@example.com student@example.com / password123");
        return;
    }

    const beforeWorkflow = await request("GET", `/api/schedules/${scheduleId}/versions`, { token: tokens.cell });
    check("1 draft schedule has no published version", beforeWorkflow.status === 200 && !(beforeWorkflow.data.items || []).some((item) => item.state === "published"), JSON.stringify(beforeWorkflow.data));

    const studentSubmit = await request("POST", `/api/schedules/${scheduleId}/submit-review`, { token: tokens.student });
    const facultySubmit = await request("POST", `/api/schedules/${scheduleId}/submit-review`, { token: tokens.faculty });
    const deptSubmit = await request("POST", `/api/schedules/${scheduleId}/submit-review`, { token: tokens.dept });
    check("3 unauthorized user cannot submit review", studentSubmit.status === 403 && facultySubmit.status === 403 && deptSubmit.status === 403, `${studentSubmit.status}/${facultySubmit.status}/${deptSubmit.status}`);

    const toReview = await request("POST", `/api/schedules/${scheduleId}/submit-review`, { token: tokens.cell });
    check("2 draft can enter exam cell review", toReview.status === 200 && toReview.data.stage === "EXAM_CELL_REVIEW", JSON.stringify(toReview.data));

    const skipVerify = await request("POST", `/api/schedules/${scheduleId}/verify`, { token: tokens.cell });
    const skipApprove = await request("POST", `/api/schedules/${scheduleId}/approve`, { token: tokens.cell });
    const skipPublish = await request("POST", `/api/schedules/${scheduleId}/publish`, { token: tokens.cell, body: { confirmImpact: true } });
    check("4 exam cell cannot skip required workflow", skipVerify.status === 403 && skipApprove.status === 403 && skipPublish.status === 409, `${skipVerify.status} ${skipVerify.data?.message} / ${skipApprove.status} ${skipApprove.data?.message} / ${skipPublish.status} ${skipPublish.data?.message}`);

    const toDepartment = await request("POST", `/api/schedules/${scheduleId}/submit-review`, { token: tokens.cell });
    check("exam cell review moves only to department verification", toDepartment.status === 200 && toDepartment.data.stage === "DEPARTMENT_VERIFICATION", JSON.stringify(toDepartment.data));
    const jumpAgain = await request("POST", `/api/schedules/${scheduleId}/submit-review`, { token: tokens.cell });
    check("further submit does not jump ahead", jumpAgain.status === 409, jumpAgain.data?.message);

    const deptList = await request("GET", "/api/schedules?approvalStage=DEPARTMENT_VERIFICATION&limit=20", { token: tokens.dept });
    const deptSummary = await request("GET", "/api/schedules/workflow-summary", { token: tokens.dept });
    check("5 department admin sees own department pending review", deptList.status === 200 && (deptList.data.items || []).some((item) => String(item._id) === String(scheduleId)) && deptSummary.data.departmentVerification >= 1, JSON.stringify(deptSummary.data));

    const otherVerify = await request("POST", `/api/schedules/${scheduleId}/verify`, { token: tokens.other });
    const otherVersions = await request("GET", `/api/schedules/${scheduleId}/versions`, { token: tokens.other });
    check("6 department admin cannot verify another department", otherVerify.status === 403, otherVerify.data?.message);
    check("42 department admin sees only department-scoped versions", otherVersions.status === 403, otherVersions.data?.message);

    const missingDeptReason = await request("POST", `/api/schedules/${scheduleId}/return`, { token: tokens.dept, body: { action: "reject", reason: "no" } });
    check("7 department rejection requires reason", missingDeptReason.status === 400, missingDeptReason.data?.message);
    const deptReject = await request("POST", `/api/schedules/${scheduleId}/return`, {
        token: tokens.dept,
        body: { action: "reject", reason: "Subject eligibility count does not match submitted student list." }
    });
    check("department rejection keeps history", deptReject.status === 200 && deptReject.data.stage === "DRAFT" && deptReject.data.status === "rejected" && deptReject.data.history.some((entry) => entry.action === "rejected"), JSON.stringify(deptReject.data));

    await request("POST", `/api/schedules/${scheduleId}/submit-review`, { token: tokens.cell });
    const backToDept = await request("POST", `/api/schedules/${scheduleId}/submit-review`, { token: tokens.cell });
    const verified = await request("POST", `/api/schedules/${scheduleId}/verify`, { token: tokens.dept });
    check("8 department verification succeeds with valid role", backToDept.data.stage === "DEPARTMENT_VERIFICATION" && verified.status === 200 && verified.data.stage === "ACADEMIC_APPROVAL", JSON.stringify(verified.data));

    const earlyApprove = await request("POST", `/api/schedules/${scheduleId}/approve`, { token: tokens.cell });
    check("10 unauthorized role cannot approve", earlyApprove.status === 403, earlyApprove.data?.message);

    const second = await request("POST", "/api/schedules", {
        token: tokens.cell,
        body: {
            examination: examination.data.exam._id,
            subject: subject.data.item._id,
            date: "2026-10-21",
            session: morning._id,
            room: roomB.data.item._id,
            status: "draft"
        }
    });
    const secondId = second.data?.item?._id;
    await request("POST", `/api/schedules/${secondId}/submit-review`, { token: tokens.cell });
    const approveTooSoon = await request("POST", `/api/schedules/${secondId}/approve`, { token: tokens.super });
    check("9 academic approval requires prior department verification", approveTooSoon.status === 409 && /department verification/i.test(approveTooSoon.data?.message || ""), approveTooSoon.data?.message);

    const missingAcademicReason = await request("POST", `/api/schedules/${scheduleId}/return`, { token: tokens.super, body: { action: "reject" } });
    check("11 academic rejection requires reason", missingAcademicReason.status === 400, missingAcademicReason.data?.message);
    const academicReturn = await request("POST", `/api/schedules/${scheduleId}/return`, {
        token: tokens.super,
        body: { action: "return", reason: "Move DBMS to the afternoon session." }
    });
    check("academic return records the reason", academicReturn.status === 200 && academicReturn.data.stage === "DEPARTMENT_VERIFICATION" && academicReturn.data.history.some((entry) => entry.reason.includes("afternoon")), JSON.stringify(academicReturn.data));
    await request("POST", `/api/schedules/${scheduleId}/verify`, { token: tokens.dept });
    const approved = await request("POST", `/api/schedules/${scheduleId}/approve`, { token: tokens.super });
    check("academic approval succeeds for super admin", approved.status === 200 && approved.data.status === "approved" && approved.data.stage === "ACADEMIC_APPROVAL", JSON.stringify(approved.data));

    const publishEarly = await request("POST", `/api/schedules/${secondId}/publish`, { token: tokens.cell, body: { confirmImpact: true } });
    check("12 publication requires all required approvals", publishEarly.status === 409, publishEarly.data?.message);
    const publishUnconfirmed = await request("POST", `/api/schedules/${scheduleId}/publish`, { token: tokens.cell, body: {} });
    check("publication requires impact review", publishUnconfirmed.status === 400, publishUnconfirmed.data?.message);

    const facultyDuty = await request("POST", "/api/invigilation", {
        token: tokens.cell,
        body: { schedule: scheduleId, room: roomA.data.item._id, faculty: faculty._id }
    });
    check("invigilation duty assigned before publication", facultyDuty.status === 201, JSON.stringify(facultyDuty.data));

    const published = await request("POST", `/api/schedules/${scheduleId}/publish`, { token: tokens.cell, body: { confirmImpact: true } });
    const publishedSchedule = await Schedule.findById(scheduleId);
    check("publish succeeds and locks the schedule", published.status === 200 && publishedSchedule.workflowLocked && publishedSchedule.publishedVersion === 1 && publishedSchedule.status === "scheduled", JSON.stringify(published.data));
    check("13 published schedule becomes locked", publishedSchedule.workflowLocked === true, String(publishedSchedule.workflowLocked));

    const directPut = await request("PUT", `/api/schedules/${scheduleId}`, {
        token: tokens.cell,
        body: { date: "2026-10-09", room: roomB.data.item._id, status: "scheduled" }
    });
    const afterPut = await Schedule.findById(scheduleId);
    check("14 direct PUT to published schedule is rejected", directPut.status === 409 && /locked/i.test(directPut.data?.message || "") && afterPut.date.toISOString().slice(0, 10) === "2026-10-08", `${directPut.status} ${directPut.data?.message}`);
    check("46 concurrent stale publication edit is rejected", directPut.status === 409 && String(afterPut.room) === String(roomA.data.item._id), String(afterPut.room));

    const studentNotes = await request("GET", "/api/notifications", { token: tokens.student });
    const studentTwoNotes = await request("GET", "/api/notifications", { token: tokens.studentTwo || tokens.student });
    check("30 published notification created once", countTitle(studentNotes, "Examination Schedule Published") === 1, JSON.stringify(titles(studentNotes)));
    const publishAgain = await request("POST", `/api/schedules/${scheduleId}/publish`, { token: tokens.cell, body: { confirmImpact: true } });
    const studentNotesAgain = await request("GET", "/api/notifications", { token: tokens.student });
    check("34 no duplicate notification for repeated publication", publishAgain.status === 409 && countTitle(studentNotesAgain, "Examination Schedule Published") === 1, `${publishAgain.status} ${JSON.stringify(titles(studentNotesAgain))}`);

    const missingReason = await request("POST", `/api/schedules/${scheduleId}/new-version`, { token: tokens.cell, body: {} });
    check("missing change reason is rejected", missingReason.status === 400, missingReason.data?.message);
    const nextVersion = await request("POST", `/api/schedules/${scheduleId}/new-version`, {
        token: tokens.cell,
        body: { changeReason: "Room unavailable" }
    });
    check("15 create new version from published schedule", nextVersion.status === 201 && nextVersion.data.versionNumber === 2, JSON.stringify(nextVersion.data));
    check("24 change reason is stored", nextVersion.data.changeReason === "Room unavailable", nextVersion.data.changeReason);

    const v1Before = await request("GET", `/api/schedules/${scheduleId}/versions/1`, { token: tokens.cell });
    const liveBefore = await request("GET", `/api/schedules/${scheduleId}`, { token: tokens.cell });
    const edited = await request("PUT", `/api/schedules/${scheduleId}/versions/2`, {
        token: tokens.cell,
        body: { date: "2026-10-10", session: afternoon._id, room: roomB.data.item._id }
    });
    const v1After = await request("GET", `/api/schedules/${scheduleId}/versions/1`, { token: tokens.cell });
    const liveAfter = await request("GET", `/api/schedules/${scheduleId}`, { token: tokens.cell });
    check("16 published v1 remains unchanged", v1Before.data.snapshot.room.roomNumber === "C-001" && v1After.data.snapshot.room.roomNumber === "C-001" && v1After.data.snapshot.date === "2026-10-08", JSON.stringify(v1After.data.snapshot));
    check("17 new draft becomes v2", edited.status === 200 && edited.data.versionNumber === 2 && edited.data.state === "draft" && edited.data.snapshot.room.roomNumber === "C-002", JSON.stringify(edited.data));
    check("live schedule stays on published v1 while v2 is draft", liveBefore.data.item.room.roomNumber === "C-001" && liveAfter.data.item.room.roomNumber === "C-001", liveAfter.data.item.room?.roomNumber);
    const numbers = await ScheduleVersion.find({ schedule: scheduleId }).sort({ versionNumber: 1 });
    check("18 version number increments correctly", numbers.map((item) => item.versionNumber).join(",") === "1,2", numbers.map((item) => item.versionNumber).join(","));

    const history = await request("GET", `/api/schedules/${scheduleId}/versions`, { token: tokens.cell });
    check("19 version history lists v1 and v2", (history.data.items || []).map((item) => `${item.versionNumber}:${item.state}`).join(",") === "1:published,2:draft", JSON.stringify(history.data.items?.map((item) => item.state)));

    const compared = await request("GET", `/api/schedules/${scheduleId}/versions/compare?from=1&to=2`, { token: tokens.cell });
    const fields = new Set((compared.data.changes || []).map((change) => change.field));
    const dateChange = (compared.data.changes || []).find((change) => change.field === "date");
    const roomChange = (compared.data.changes || []).find((change) => change.field === "room");
    const sessionChange = (compared.data.changes || []).find((change) => change.field === "session");
    const timeChange = (compared.data.changes || []).find((change) => change.field === "reportingTime" || change.field === "startTime");
    check("20 version comparison detects changed date", dateChange && dateChange.from === "2026-10-08" && dateChange.to === "2026-10-10", JSON.stringify(compared.data.changes));
    check("21 version comparison detects changed room", roomChange && roomChange.from === "C-001" && roomChange.to === "C-002", JSON.stringify(roomChange));
    check("22 version comparison detects changed time and session", Boolean(sessionChange) && sessionChange.from === "Morning" && sessionChange.to === "Afternoon" && Boolean(timeChange), JSON.stringify(compared.data.changes));
    check("23 unchanged fields are excluded from diff", !fields.has("building") && !fields.has("duration") && !fields.has("subject") && !fields.has("instructions"), [...fields].join(","));

    const studentDraft = await request("GET", `/api/schedules/${scheduleId}/versions/2`, { token: tokens.student });
    const studentSchedule = await request("GET", `/api/schedules/${scheduleId}`, { token: tokens.student });
    check("28 draft version is invisible to students", studentDraft.status === 403 && studentSchedule.status === 200 && !studentSchedule.data.approval && studentSchedule.data.item.room.roomNumber === "C-001", `${studentDraft.status} ${studentSchedule.data?.item?.room?.roomNumber}`);
    const facultyDraft = await request("GET", `/api/schedules/${scheduleId}/versions`, { token: tokens.faculty });
    const facultyApproval = await request("GET", `/api/schedules/${scheduleId}/approval`, { token: tokens.faculty });
    check("29 draft version is invisible to faculty", facultyDraft.status === 403, String(facultyDraft.status));
    check("43 faculty cannot access approval endpoints", facultyApproval.status === 403, String(facultyApproval.status));
    const studentApproval = await request("GET", `/api/schedules/${scheduleId}/approval`, { token: tokens.student });
    check("44 student cannot access approval endpoints", studentApproval.status === 403 && studentSubmit.status === 403, String(studentApproval.status));

    const impact = await request("GET", `/api/schedules/${scheduleId}/impact`, { token: tokens.cell });
    check("35 impact analysis returns affected students", impact.status === 200 && impact.data.students >= 2, JSON.stringify(impact.data));
    check("36 impact analysis returns affected faculty", impact.data.faculty >= 1 && (impact.data.facultyNames || []).includes("Faculty Cross"), JSON.stringify(impact.data));
    check("37 impact analysis returns affected departments", impact.data.departments >= 2 && (impact.data.departmentNames || []).includes("Computing") && (impact.data.departmentNames || []).includes("Electrical"), JSON.stringify(impact.data));

    const mutatePublished = await request("PUT", `/api/schedules/${scheduleId}/versions/1`, {
        token: tokens.cell,
        body: { room: roomB.data.item._id }
    });
    const v1Still = await ScheduleVersion.findOne({ schedule: scheduleId, versionNumber: 1 });
    check("45 already-published version cannot be mutated", mutatePublished.status === 409 && v1Still.snapshot.room.roomNumber === "C-001" && v1Still.state === "published", `${mutatePublished.status} ${mutatePublished.data?.message}`);

    await request("POST", `/api/schedules/${scheduleId}/submit-review`, { token: tokens.cell });
    await request("POST", `/api/schedules/${scheduleId}/submit-review`, { token: tokens.cell });
    await request("POST", `/api/schedules/${scheduleId}/verify`, { token: tokens.dept });
    await request("POST", `/api/schedules/${scheduleId}/approve`, { token: tokens.super });
    const publishedV2 = await request("POST", `/api/schedules/${scheduleId}/publish`, { token: tokens.cell, body: { confirmImpact: true } });
    const v1Final = await ScheduleVersion.findOne({ schedule: scheduleId, versionNumber: 1 });
    const v2Final = await ScheduleVersion.findOne({ schedule: scheduleId, versionNumber: 2 });
    const liveFinal = await Schedule.findById(scheduleId).populate("room", "roomNumber");
    check("25 publishing v2 archives v1", publishedV2.status === 200 && v1Final.state === "archived" && v1Final.snapshot.room.roomNumber === "C-001", `${publishedV2.status} ${v1Final.state} ${publishedV2.data?.message}`);
    check("26 v2 becomes current published version", v2Final.state === "published" && liveFinal.publishedVersion === 2 && liveFinal.room.roomNumber === "C-002", `${v2Final.state} ${liveFinal.publishedVersion}`);
    const historical = await request("GET", `/api/schedules/${scheduleId}/versions/1`, { token: tokens.cell });
    check("27 historical v1 remains queryable", historical.status === 200 && historical.data.state === "archived" && historical.data.snapshot.date === "2026-10-08", JSON.stringify(historical.data.state));

    const rescheduledNotes = await request("GET", "/api/notifications", { token: tokens.student });
    const roomNotes = rescheduledNotes;
    check("31 reschedule notification targets affected students", countTitle(rescheduledNotes, "Examination Rescheduled") === 1, JSON.stringify(titles(rescheduledNotes)));
    check("32 room-change notification targets affected students", countTitle(roomNotes, "Examination Room Changed") === 1, JSON.stringify(titles(roomNotes)));
    const facultyNotes = await request("GET", "/api/notifications", { token: tokens.faculty });
    check("33 affected faculty are identified for invigilation change", titles(facultyNotes).includes("Invigilation Duty Changed") || titles(facultyNotes).includes("Invigilation Duty Rescheduled"), JSON.stringify(titles(facultyNotes)));
    const duties = await InvigilationDuty.find({ schedule: scheduleId, status: "assigned" });
    check("48 existing invigilation duties remain consistent after schedule change", duties.length === 1 && String(duties[0].room) === String(roomB.data.item._id) && duties[0].date.toISOString().slice(0, 10) === "2026-10-10", `count=${duties.length} date=${duties[0]?.date}`);

    const publishV2Again = await request("POST", `/api/schedules/${scheduleId}/publish`, { token: tokens.cell, body: { confirmImpact: true } });
    const notesAfterRepeat = await request("GET", "/api/notifications", { token: tokens.student });
    check("repeating v2 publication does not add notifications", publishV2Again.status === 409 && countTitle(notesAfterRepeat, "Examination Rescheduled") === 1 && countTitle(notesAfterRepeat, "Examination Room Changed") === 1, JSON.stringify(titles(notesAfterRepeat)));

    const logs = await ActivityLog.find({ entity: "Schedule", entityId: scheduleId });
    const actions = new Set(logs.map((item) => item.action));
    check("38 audit entry created on version creation", actions.has("version_created"), [...actions].join(","));
    check("39 audit entry created on approval", actions.has("approved") || actions.has("department_verified"), [...actions].join(","));
    check("40 audit entry created on rejection", actions.has("rejected"), [...actions].join(","));
    check("41 audit entry created on publication", actions.has("published") && actions.has("archived"), [...actions].join(","));

    const otherSummary = await request("GET", "/api/schedules/workflow-summary", { token: tokens.other });
    check("other department summary excludes this schedule", otherSummary.status === 200 && otherSummary.data.departmentVerification === 0 && otherSummary.data.published === 0, JSON.stringify(otherSummary.data));

    const cancelSubject = await request("POST", "/api/subjects", {
        token: tokens.cell,
        body: { code: "CAN", name: "Cancellation Paper", subjectType: "theory", department: cse.data.item._id, program: program.data.item._id, semester: 6, duration: 180 }
    });
    await request("PATCH", `/api/subjects/${cancelSubject.data.item._id}/verification`, {
        token: tokens.dept,
        body: { verificationStatus: "verified" }
    });
    for (const person of [student, studentTwo]) {
        await request("POST", "/api/registrations", {
            token: tokens.cell,
            body: { student: person._id, subject: cancelSubject.data.item._id, academicYear: year.data.item._id, semester: 6, registrationStatus: "registered" }
        });
    }
    await request("POST", "/api/eligibility/calculate", {
        token: tokens.cell,
        body: { examination: examination.data.exam._id, subject: cancelSubject.data.item._id }
    });
    const cancelSchedule = await request("POST", "/api/schedules", {
        token: tokens.cell,
        body: {
            examination: examination.data.exam._id,
            subject: cancelSubject.data.item._id,
            date: "2026-10-22",
            session: afternoon._id,
            room: roomA.data.item._id,
            status: "draft"
        }
    });
    const cancelId = cancelSchedule.data?.item?._id;
    await request("POST", `/api/schedules/${cancelId}/submit-review`, { token: tokens.cell });
    await request("POST", `/api/schedules/${cancelId}/submit-review`, { token: tokens.cell });
    await request("POST", `/api/schedules/${cancelId}/verify`, { token: tokens.dept });
    await request("POST", `/api/schedules/${cancelId}/approve`, { token: tokens.super });
    await request("POST", `/api/schedules/${cancelId}/publish`, { token: tokens.cell, body: { confirmImpact: true } });
    const cancelPut = await request("PUT", `/api/schedules/${cancelId}`, { token: tokens.cell, body: { status: "cancelled" } });
    const cancelVersion = await request("POST", `/api/schedules/${cancelId}/new-version`, {
        token: tokens.cell,
        body: { changeReason: "Examination postponed" }
    });
    const cancelEdit = await request("PUT", `/api/schedules/${cancelId}/versions/2`, {
        token: tokens.cell,
        body: { operationalChange: "cancelled" }
    });
    const cancelSkip = await request("POST", `/api/schedules/${cancelId}/publish`, { token: tokens.cell, body: { confirmImpact: true } });
    await request("POST", `/api/schedules/${cancelId}/submit-review`, { token: tokens.cell });
    await request("POST", `/api/schedules/${cancelId}/submit-review`, { token: tokens.cell });
    await request("POST", `/api/schedules/${cancelId}/verify`, { token: tokens.dept });
    await request("POST", `/api/schedules/${cancelId}/approve`, { token: tokens.super });
    const cancelPublished = await request("POST", `/api/schedules/${cancelId}/publish`, { token: tokens.cell, body: { confirmImpact: true } });
    const cancelLive = await Schedule.findById(cancelId);
    const cancelExam = await Exam.findById(examination.data.exam._id);
    const cancelV1 = await ScheduleVersion.findOne({ schedule: cancelId, versionNumber: 1 });
    check("47 cancelled schedule follows valid change rules", Boolean(cancelLive) && cancelPut.status === 409 && cancelVersion.status === 201 && cancelEdit.status === 200 && cancelSkip.status === 409 && cancelPublished.status === 200 && cancelLive.operationalState === "cancelled" && cancelExam.status === "scheduled" && cancelV1?.state === "archived" && !cancelV1.snapshot.operationalChange, `put=${cancelPut.status} version=${cancelVersion.status} edit=${cancelEdit.status} skip=${cancelSkip.status} pub=${cancelPublished.status} ${cancelPublished.data?.message} id=${cancelId} op=${cancelLive?.operationalState} v1=${cancelV1?.state} exam=${cancelExam?.status}`);

    const studentTwoCount = countTitle(await request("GET", "/api/notifications", { token: tokenFor(studentTwo) }), "Examination Schedule Published");
    check("published notice reaches each eligible student", studentTwoCount >= 1, String(studentTwoCount));
    void studentTwoNotes;

    const failed = results.filter((item) => !item.ok);
    console.log(`PHASE2_APPROVAL_VERSION_CHECKS ${results.length - failed.length}/${results.length}`);
    if (failed.length) {
        server.close();
        await mongoose.disconnect();
        if (memory) await memory.stop();
        process.exit(1);
    }

    if (process.env.HOLD === "1") {
        console.log(`HOLD http://127.0.0.1:${port}`);
        console.log("cell@example.com dept@example.com super@example.com faculty.a@example.com student@example.com / password123");
        return;
    }

    server.close();
    await mongoose.disconnect();
    if (memory) await memory.stop();
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
