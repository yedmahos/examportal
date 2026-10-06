/**
 * Phase 2.5 hall ticket checks.
 * Uses an in-memory MongoDB server and does not touch production data.
 */
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");

process.env.JWT_SECRET = process.env.JWT_SECRET || "phase2-hall-ticket-check";
process.env.USE_MEMORY = "1";

const User = require("../models/User");
const Schedule = require("../models/Schedule");
const SeatingPlan = require("../models/SeatingPlan");
const SeatAllocation = require("../models/SeatAllocation");
const ExamEligibility = require("../models/ExamEligibility");
const Notification = require("../models/Notification");
const ActivityLog = require("../models/ActivityLog");
const { ensureCatalog } = require("../services/catalogSeed");
const { UNPUBLISHED, NO_PLAN, NO_SEAT, CANCELLED, DENIED } = require("../services/hallTicketService");

const tokenFor = (user) => jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET
);

const startMemory = async () => {
    const { MongoMemoryServer } = require("/tmp/mongotest/node_modules/mongodb-memory-server");
    return MongoMemoryServer.create();
};

const app = express();
app.use(cors({ origin: true, exposedHeaders: ["Content-Disposition"] }));
app.use(express.json());
const mount = (prefix, routes) => app.use(prefix, routes);
mount("/api/auth", require("../routes/authRoutes"));
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
mount("/api/exams", require("../routes/examRoutes"));
mount("/api/schedules", require("../routes/scheduleRoutes"));
mount("/api/rooms", require("../routes/roomRoutes"));
mount("/api/seating-plans", require("../routes/seatingRoutes"));
mount("/api/notifications", require("../routes/notificationRoutes"));
mount("/api/hall-tickets", require("../routes/hallTicketRoutes"));

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
    const buffer = Buffer.from(await response.arrayBuffer());
    let data = null;
    try { data = JSON.parse(buffer.toString("utf8")); } catch { data = null; }
    return {
        status: response.status,
        data,
        buffer,
        text: buffer.toString("latin1"),
        type: response.headers.get("content-type") || "",
        disposition: response.headers.get("content-disposition") || "",
        cache: response.headers.get("cache-control") || ""
    };
};

const pagesOf = (text) => (text.match(/\/Type \/Page(?!s)/g) || []).length;

const pdfPlain = (buffer) => {
    const raw = buffer.toString("latin1");
    const parts = [];
    const pattern = /\[([\s\S]*?)\]\s*TJ/g;
    let match;
    while ((match = pattern.exec(raw))) {
        let text = "";
        const hexes = match[1].match(/<([0-9A-Fa-f]+)>/g) || [];
        for (const item of hexes) {
            const digits = item.slice(1, -1);
            if (digits.length % 2) continue;
            for (let index = 0; index < digits.length; index += 2) {
                const code = parseInt(digits.slice(index, index + 2), 16);
                if (code >= 32 && code <= 126) text += String.fromCharCode(code);
            }
        }
        if (text.trim()) parts.push(text);
    }
    return parts.join("\n");
};

const run = async () => {
    const memory = await startMemory();
    await mongoose.connect(memory.getUri());
    await ensureCatalog();

    const password = await bcrypt.hash("password123", 4);
    const createUser = (fields) => User.create({ password, status: "active", ...fields });
    const superAdmin = await createUser({ name: "Super Admin", email: "super.ht@example.com", role: "super_admin" });
    const examCell = await createUser({ name: "Exam Cell", email: "cell.ht@example.com", role: "examination_cell" });
    const deptAdmin = await createUser({ name: "Dept Admin", email: "dept.ht@example.com", role: "department_admin" });
    const faculty = await createUser({ name: "Faculty One", email: "faculty.ht@example.com", role: "faculty" });
    const legacyAdmin = await createUser({ name: "Legacy Admin", email: "admin.ht@example.com", role: "admin" });
    const asha = await createUser({
        name: "Asha Rao",
        email: "asha.ht@example.com",
        role: "student",
        studentId: "STU001",
        department: "Computing",
        program: "BSc Computing",
        semester: 6,
        academicYear: "2026-2027"
    });
    const bima = await createUser({
        name: "Bima Cole",
        email: "bima.ht@example.com",
        role: "student",
        studentId: "STU002",
        department: "Computing",
        semester: 6,
        academicYear: "2026-2027"
    });
    const dev = await createUser({
        name: "Dev Patel",
        email: "dev.ht@example.com",
        role: "student",
        studentId: "STU003",
        department: "Computing",
        program: "BSc Computing",
        semester: 6,
        academicYear: "2026-2027"
    });
    const cara = await createUser({
        name: "Cara Outsider",
        email: "cara.ht@example.com",
        role: "student",
        studentId: "STU009"
    });

    const tokens = {
        super: tokenFor(superAdmin),
        cell: tokenFor(examCell),
        dept: tokenFor(deptAdmin),
        faculty: tokenFor(faculty),
        admin: tokenFor(legacyAdmin),
        asha: tokenFor(asha),
        bima: tokenFor(bima),
        dev: tokenFor(dev),
        cara: tokenFor(cara)
    };

    const server = await new Promise((resolve) => {
        const listener = app.listen(Number(process.env.PORT) || 0, "127.0.0.1", () => resolve(listener));
    });
    port = server.address().port;

    const must = async (name, method, urlPath, token, body) => {
        const response = await request(method, urlPath, { token, body });
        if (response.status >= 400) {
            throw new Error(`${name} ${response.status} ${JSON.stringify(response.data)}`);
        }
        return response;
    };

    const publishFlow = async (scheduleId) => {
        await must("submit review", "POST", `/api/schedules/${scheduleId}/submit-review`, tokens.cell);
        await must("submit department", "POST", `/api/schedules/${scheduleId}/submit-review`, tokens.cell);
        await must("verify", "POST", `/api/schedules/${scheduleId}/verify`, tokens.dept);
        await must("approve", "POST", `/api/schedules/${scheduleId}/approve`, tokens.super);
        await must("publish", "POST", `/api/schedules/${scheduleId}/publish`, tokens.cell, { confirmImpact: true });
    };

    const year = await must("year", "POST", "/api/academic-years", tokens.super, {
        name: "2026-2027", startDate: "2026-06-01", endDate: "2027-05-31", isActive: true
    });
    const computing = await must("department", "POST", "/api/departments", tokens.super, { name: "Computing", code: "COMPHT" });
    await User.findByIdAndUpdate(deptAdmin._id, { departmentRef: computing.data.item._id });
    const program = await must("program", "POST", "/api/programs", tokens.super, {
        name: "BSc Computing", code: "BSCHT", department: computing.data.item._id, duration: 4
    });
    const batch = await must("batch", "POST", "/api/batches", tokens.super, {
        name: "Comp HT", academicYear: year.data.item._id, program: program.data.item._id, semester: 6
    });
    const section = await must("section", "POST", "/api/sections", tokens.super, { name: "A", batch: batch.data.item._id });
    const sessions = await request("GET", "/api/sessions?limit=20", { token: tokens.cell });
    const morning = (sessions.data.items || []).find((item) => item.code === "MORNING");
    const afternoon = (sessions.data.items || []).find((item) => item.code === "AFTERNOON");
    const types = await request("GET", "/api/exam-types?limit=20", { token: tokens.cell });
    const sentence = "Candidates must remain seated until the invigilator collects every answer book. ";
    const instructions = `Bring the college identity card. ${sentence.repeat(80)}`;
    const examination = await must("exam", "POST", "/api/exams", tokens.cell, {
        examinationSetup: true,
        title: "End Semester Examinations",
        examType: types.data.items.find((item) => item.code === "END")._id,
        academicYear: year.data.item._id,
        department: computing.data.item._id,
        program: program.data.item._id,
        semester: 6,
        startDate: "2026-10-01",
        endDate: "2026-10-31",
        sessions: [morning._id, afternoon._id],
        eligibleBatches: [batch.data.item._id],
        instructions
    });
    const subject = await must("subject", "POST", "/api/subjects", tokens.cell, {
        code: "BDA", name: "Big Data Analytics", subjectType: "theory", department: computing.data.item._id, program: program.data.item._id, semester: 6, duration: 180
    });
    const quietSubject = await must("quiet subject", "POST", "/api/subjects", tokens.cell, {
        code: "CAN", name: "Cancelled Paper", subjectType: "theory", department: computing.data.item._id, program: program.data.item._id, semester: 6, duration: 120
    });
    await must("verify bda", "PATCH", `/api/subjects/${subject.data.item._id}/verification`, tokens.dept, { verificationStatus: "verified" });
    await must("verify can", "PATCH", `/api/subjects/${quietSubject.data.item._id}/verification`, tokens.dept, { verificationStatus: "verified" });

    for (const person of [asha, bima, dev]) {
        await must("enroll", "POST", "/api/enrollments", tokens.cell, {
            student: person._id, program: program.data.item._id, batch: batch.data.item._id, section: section.data.item._id, academicYear: year.data.item._id, semester: 6
        });
        for (const paper of [subject.data.item, quietSubject.data.item]) {
            await must("register", "POST", "/api/registrations", tokens.cell, {
                student: person._id, subject: paper._id, academicYear: year.data.item._id, semester: 6, registrationStatus: "registered"
            });
        }
    }
    await must("eligibility bda", "POST", "/api/eligibility/calculate", tokens.cell, {
        examination: examination.data.exam._id, subject: subject.data.item._id
    });
    await must("eligibility can", "POST", "/api/eligibility/calculate", tokens.cell, {
        examination: examination.data.exam._id, subject: quietSubject.data.item._id
    });

    const roomA = await must("room a", "POST", "/api/rooms", tokens.cell, {
        roomNumber: "C-001", building: "C-25", floor: "1", capacity: 40, roomType: "hall"
    });
    const roomB = await must("room b", "POST", "/api/rooms", tokens.cell, {
        roomNumber: "C-002", building: "C-25", floor: "1", capacity: 40, roomType: "hall"
    });

    const draft = await must("draft", "POST", "/api/schedules", tokens.cell, {
        examination: examination.data.exam._id,
        subject: subject.data.item._id,
        date: "2026-10-07",
        session: morning._id,
        room: roomA.data.item._id,
        status: "draft"
    });
    const draftTicket = await request("GET", `/api/hall-tickets/${draft.data.item._id}`, { token: tokens.asha });
    check("9 draft schedule cannot generate hall ticket", draftTicket.status === 409 && draftTicket.data?.message === UNPUBLISHED && !draftTicket.text.startsWith("%PDF"), draftTicket.data?.message);

    const created = await must("schedule", "POST", "/api/schedules", tokens.cell, {
        examination: examination.data.exam._id,
        subject: subject.data.item._id,
        date: "2026-10-08",
        session: morning._id,
        room: roomA.data.item._id,
        status: "draft"
    });
    const scheduleId = created.data.item._id;
    const beforePublish = await request("GET", `/api/hall-tickets/${scheduleId}`, { token: tokens.asha });
    const liveDraft = await Schedule.findById(scheduleId).select("status");
    check("10 unpublished schedule cannot generate hall ticket", liveDraft.status === "draft" && beforePublish.status === 409 && beforePublish.data?.message === UNPUBLISHED, beforePublish.data?.message);

    await publishFlow(scheduleId);
    const published = await Schedule.findById(scheduleId);
    check("14 hall ticket uses current published schedule", published.status === "scheduled" && published.publishedVersion === 1 && published.workflowLocked === true, String(published.publishedVersion));

    const noPlan = await request("GET", `/api/hall-tickets/${scheduleId}`, { token: tokens.asha });
    check("11 published schedule without seating plan returns useful error", noPlan.status === 404 && noPlan.data?.message === NO_PLAN && !noPlan.text.startsWith("%PDF"), noPlan.data?.message);

    const quiet = await must("quiet schedule", "POST", "/api/schedules", tokens.cell, {
        examination: examination.data.exam._id,
        subject: quietSubject.data.item._id,
        date: "2026-10-15",
        session: afternoon._id,
        room: roomB.data.item._id,
        status: "draft"
    });
    const quietId = quiet.data.item._id;
    await publishFlow(quietId);

    await must("seat", "POST", "/api/seating-plans", tokens.cell, { schedule: scheduleId, strategy: "ROLL_NUMBER" });
    const publishedPlan = await SeatingPlan.findOne({ schedule: scheduleId, status: "published" });
    const draftPlan = await SeatingPlan.create({
        schedule: scheduleId,
        status: "draft",
        strategy: "ROLL_NUMBER",
        generatedAt: new Date(),
        generatedBy: examCell._id,
        version: 9,
        studentCount: 1,
        roomCount: 1
    });
    await SeatAllocation.create({
        seatingPlan: draftPlan._id,
        schedule: scheduleId,
        student: asha._id,
        room: roomA.data.item._id,
        seatNumber: "DRAFT-9",
        row: "D",
        column: 9,
        sequence: 99
    });

    const anonymous = await request("GET", `/api/hall-tickets/${scheduleId}`);
    check("2 unauthenticated request is blocked", anonymous.status === 401 && !anonymous.text.startsWith("%PDF"), String(anonymous.status));

    for (const [label, token] of [
        ["3 faculty cannot request hall ticket", tokens.faculty],
        ["4 department admin cannot request hall ticket", tokens.dept],
        ["5 examination cell cannot request hall ticket", tokens.cell],
        ["6 super admin cannot request hall ticket", tokens.super],
        ["legacy admin cannot request hall ticket", tokens.admin]
    ]) {
        const denied = await request("GET", `/api/hall-tickets/${scheduleId}`, { token });
        check(label, denied.status === 403 && denied.data?.message === DENIED && !denied.text.startsWith("%PDF"), `${denied.status} ${denied.data?.message}`);
    }

    const missing = await request("GET", `/api/hall-tickets/${new mongoose.Types.ObjectId()}`, { token: tokens.asha });
    check("8 nonexistent schedule returns 404", missing.status === 404 && missing.data?.message === "Schedule not found", missing.data?.message);
    const invalid = await request("GET", "/api/hall-tickets/not-an-id", { token: tokens.asha });
    check("invalid schedule id is rejected", invalid.status === 400, invalid.data?.message);

    const outsider = await request("GET", `/api/hall-tickets/${scheduleId}`, { token: tokens.cara });
    const outsiderBody = JSON.stringify(outsider.data || {});
    check("7 student cannot access another student's hall ticket", outsider.status === 403 && outsider.data?.message === DENIED && !outsiderBody.includes("Asha Rao") && !outsiderBody.includes("C-001") && !outsider.text.startsWith("%PDF"), outsiderBody);

    const ashaSeat = await SeatAllocation.findOne({ seatingPlan: publishedPlan._id, student: asha._id });
    const bimaSeat = await SeatAllocation.findOne({ seatingPlan: publishedPlan._id, student: bima._id });
    const ashaPdf = await request("GET", `/api/hall-tickets/${scheduleId}?studentId=${bima._id}`, { token: tokens.asha });
    const bimaPdf = await request("GET", `/api/hall-tickets/${scheduleId}`, { token: tokens.bima });
    const ashaText = pdfPlain(ashaPdf.buffer);
    const bimaText = pdfPlain(bimaPdf.buffer);
    if (process.env.SAVE_PDF === "1") {
        require("fs").writeFileSync("/tmp/hall-ticket-asha.pdf", ashaPdf.buffer);
    }
    check("1 authenticated student can request own published hall ticket", ashaPdf.status === 200 && ashaPdf.text.startsWith("%PDF") && ashaText.includes("Asha Rao") && !ashaText.includes("Bima Cole"), `${ashaPdf.status} ${ashaPdf.type}`);
    check("30 response content type is application/pdf", ashaPdf.type.includes("application/pdf"), ashaPdf.type);
    check("31 content-disposition contains safe pdf filename", ashaPdf.disposition.includes("filename=\"Hall_Ticket_STU001_BDA.pdf\"") && !ashaPdf.disposition.includes(String(scheduleId)), ashaPdf.disposition);
    check("hall ticket response is private", ashaPdf.cache.includes("private") && ashaPdf.cache.includes("no-store"), ashaPdf.cache);
    check("16 hall ticket contains student name", ashaText.includes("Asha Rao"));
    check("17 hall ticket contains student ID", ashaText.includes("STU001"));
    check("18 hall ticket contains department program semester where available", ashaText.includes("Computing") && ashaText.includes("BSc Computing") && ashaText.includes("2026-2027") && ashaText.split("\n").includes("6") && !ashaText.includes("Not recorded"), "profile fields");
    check("19 hall ticket contains examination", ashaText.includes("End Semester Examinations"));
    check("20 hall ticket contains subject", ashaText.includes("Big Data Analytics"));
    check("21 hall ticket contains subject code", ashaText.includes("BDA"));
    check("22 hall ticket contains date", ashaText.includes("08 Oct 2026"));
    check("23 hall ticket contains session", ashaText.includes("Morning"));
    check("24 hall ticket contains reporting time", ashaText.includes("08:30"));
    check("25 hall ticket contains start and end time", ashaText.includes("09:00") && ashaText.includes("12:00"));
    check("26 hall ticket contains building", ashaText.includes("C-25"));
    check("27 hall ticket contains room", ashaText.includes("C-001"));
    check("28 hall ticket contains seat", ashaText.includes(ashaSeat.seatNumber));
    check("29 hall ticket contains instructions", ashaText.includes("Bring the college identity card."));
    check("32 long instructions do not break pdf generation", ashaText.includes("answer book") && pagesOf(ashaPdf.text) >= 2 && ashaPdf.buffer.length > 1000, `pages ${pagesOf(ashaPdf.text)}`);
    check("15 hall ticket uses current published seating plan", ashaText.includes(ashaSeat.seatNumber) && !ashaText.includes("DRAFT-9"));
    check("student id query cannot select another student", !ashaText.includes("Bima Cole") && bimaText.includes("Bima Cole") && bimaText.includes("Not recorded") && !bimaText.includes(ashaSeat.seatNumber) && bimaText.includes(bimaSeat.seatNumber));
    check("pdf has no password material", !ashaText.includes("password123") && !ashaText.includes("$2"));

    await User.findByIdAndUpdate(asha._id, { studentId: "STU/001:\"X\"" });
    const unsafeName = await request("GET", `/api/hall-tickets/${scheduleId}`, { token: tokens.asha });
    check("filename strips filesystem characters", unsafeName.status === 200 && unsafeName.disposition.includes("filename=\"Hall_Ticket_STU_001_X_BDA.pdf\"") && !unsafeName.disposition.includes("/") && !unsafeName.disposition.includes(":"), unsafeName.disposition);
    await User.findByIdAndUpdate(asha._id, { studentId: "STU001" });

    const noteCount = await Notification.countDocuments({ recipient: asha._id });
    const activityBefore = await ActivityLog.countDocuments();
    await request("GET", `/api/hall-tickets/${scheduleId}`, { token: tokens.asha });
    await request("GET", `/api/hall-tickets/${scheduleId}`, { token: tokens.asha });
    const noteAfter = await Notification.countDocuments({ recipient: asha._id });
    const activityAfter = await ActivityLog.countDocuments();
    const titles = (await Notification.find({ recipient: asha._id }).select("title")).map((item) => item.title);
    check("38 repeated download does not create duplicate notifications", noteAfter === noteCount && !titles.includes("Hall Ticket Generated") && !titles.includes("Hall ticket downloaded"), `${noteCount} -> ${noteAfter}`);
    check("download does not write an activity record", activityAfter === activityBefore, `${activityBefore} -> ${activityAfter}`);

    const ashaNotes = await request("GET", "/api/notifications", { token: tokens.asha });
    const notes = ashaNotes.data.notifications || [];
    const publishedNote = notes.find((item) => item.title === "Examination Schedule Published" && String(item.referenceId) === String(scheduleId));
    const seatNote = notes.find((item) => item.title === "Seat Allocation Published" && String(item.referenceId) === String(scheduleId));
    check("39 notification referenceId opens the correct schedule", String(publishedNote?.referenceId) === String(scheduleId) && String(seatNote?.referenceId) === String(scheduleId), `${publishedNote?.referenceId} ${seatNote?.referenceId}`);
    check("40 schedule published notification leads to hall ticket action", publishedNote?.type === "exam" && String(publishedNote.referenceId) === String(scheduleId));
    check("41 seat published notification leads to hall ticket action", seatNote?.type === "exam" && String(seatNote.referenceId) === String(scheduleId));

    if (process.env.SEED_HOLD === "1") {
        console.log(`HOLD http://127.0.0.1:${port}`);
        console.log(`SCHEDULE ${scheduleId}`);
        console.log(`QUIET ${quietId}`);
        console.log(`AFTERNOON ${afternoon._id}`);
        console.log(`ROOM_B ${roomB.data.item._id}`);
        console.log("asha.ht@example.com bima.ht@example.com cara.ht@example.com cell.ht@example.com dept.ht@example.com super.ht@example.com / password123");
        return;
    }

    await ExamEligibility.updateOne(
        { student: dev._id, examination: examination.data.exam._id, subject: subject.data.item._id },
        { eligibilityStatus: "blocked" }
    );
    const blocked = await request("GET", `/api/hall-tickets/${scheduleId}`, { token: tokens.dev });
    const blockedBody = JSON.stringify(blocked.data || {});
    check("13 ineligible student gets access denied", blocked.status === 403 && blocked.data?.message === DENIED && !blockedBody.includes("Asha Rao") && !blockedBody.includes(ashaSeat.seatNumber), blockedBody);

    const removed = await SeatAllocation.findOne({ seatingPlan: publishedPlan._id, student: asha._id });
    await removed.deleteOne();
    const noSeat = await request("GET", `/api/hall-tickets/${scheduleId}`, { token: tokens.asha });
    check("12 student without seat gets useful error", noSeat.status === 404 && noSeat.data?.message === NO_SEAT && !noSeat.text.startsWith("%PDF"), noSeat.data?.message);
    await must("restore seat", "POST", "/api/seating-plans/regenerate", tokens.cell, { schedule: scheduleId, strategy: "ROLL_NUMBER" });

    await Schedule.findByIdAndUpdate(scheduleId, { operationalState: "postponed" });
    const postponed = await request("GET", `/api/hall-tickets/${scheduleId}`, { token: tokens.asha });
    const postponedText = pdfPlain(postponed.buffer);
    check("postponed examination still uses the current published schedule", postponed.status === 200 && postponedText.includes("08 Oct 2026") && postponedText.includes("C-001"), String(postponed.status));
    await Schedule.findByIdAndUpdate(scheduleId, { operationalState: "" });

    const beforeVersion = await request("GET", `/api/hall-tickets/${scheduleId}`, { token: tokens.asha });
    const beforeVersionText = pdfPlain(beforeVersion.buffer);
    await must("new version", "POST", `/api/schedules/${scheduleId}/new-version`, tokens.cell, { changeReason: "Room date and session change" });
    await must("edit version", "PUT", `/api/schedules/${scheduleId}/versions/2`, tokens.cell, {
        date: "2026-10-10",
        session: afternoon._id,
        room: roomB.data.item._id
    });
    const duringDraft = await request("GET", `/api/hall-tickets/${scheduleId}`, { token: tokens.asha });
    const duringDraftText = pdfPlain(duringDraft.buffer);
    check("37 old schedule version does not leak into current hall ticket", duringDraftText.includes("08 Oct 2026") && duringDraftText.includes("C-001") && duringDraftText.includes("Morning") && !duringDraftText.includes("10 Oct 2026") && !duringDraftText.includes("C-002"), duringDraftText.split("\n").filter((line) => /Oct|C-00|Morning|Afternoon/.test(line)).join(" | "));
    await publishFlow(scheduleId);
    const changed = await request("GET", `/api/hall-tickets/${scheduleId}`, { token: tokens.asha });
    const changedText = pdfPlain(changed.buffer);
    check("33 room change updates hall ticket", changedText.includes("C-002") && !changedText.includes("C-001"), changedText.split("\n").filter((line) => line.includes("C-00")).join(" | "));
    check("34 schedule date change updates hall ticket", changedText.includes("10 Oct 2026") && !changedText.includes("08 Oct 2026"), changedText.split("\n").filter((line) => line.includes("Oct")).join(" | "));
    check("35 session change updates hall ticket", changedText.includes("Afternoon") && changedText.includes("13:30") && changedText.includes("14:00") && changedText.includes("17:00") && !changedText.includes("Morning") && !changedText.includes("08:30") && !changedText.includes("09:00"), changedText.split("\n").filter((line) => /Morning|Afternoon|\d\d:\d\d/.test(line)).join(" | "));
    check("published v2 replaced the previous hall ticket", changed.status === 200 && beforeVersionText.includes("08 Oct 2026") && !changedText.includes("08 Oct 2026"));

    const seatBefore = await SeatAllocation.findOne({
        student: asha._id,
        seatingPlan: (await SeatingPlan.findOne({ schedule: scheduleId, status: "published" }))._id
    });
    const previousSeat = seatBefore.seatNumber;
    await User.findByIdAndUpdate(asha._id, { studentId: "STU00A" });
    await User.findByIdAndUpdate(bima._id, { studentId: "STU00B" });
    await User.findByIdAndUpdate(asha._id, { studentId: "STU002" });
    await User.findByIdAndUpdate(bima._id, { studentId: "STU001" });
    await must("regenerate seats", "POST", "/api/seating-plans/regenerate", tokens.cell, { schedule: scheduleId, strategy: "ROLL_NUMBER" });
    await User.findByIdAndUpdate(asha._id, { studentId: "STU00A" });
    await User.findByIdAndUpdate(bima._id, { studentId: "STU002" });
    await User.findByIdAndUpdate(asha._id, { studentId: "STU001" });
    const currentPlan = await SeatingPlan.findOne({ schedule: scheduleId, status: "published" });
    const seatAfter = await SeatAllocation.findOne({ seatingPlan: currentPlan._id, student: asha._id });
    const superseded = await SeatingPlan.findOne({ schedule: scheduleId, status: "superseded" }).sort({ version: -1 });
    const staleSeat = await SeatAllocation.findOne({ seatingPlan: superseded._id, student: asha._id });
    staleSeat.seatNumber = "STALE-99";
    await staleSeat.save();
    const reseated = await request("GET", `/api/hall-tickets/${scheduleId}`, { token: tokens.asha });
    const reseatedText = pdfPlain(reseated.buffer);
    check("36 seat change updates hall ticket", seatAfter.seatNumber !== previousSeat && reseatedText.includes(seatAfter.seatNumber) && !reseatedText.includes(previousSeat) && !reseatedText.includes("STALE-99") && reseatedText.includes("C-002"), `${previousSeat} -> ${seatAfter.seatNumber}`);
    const updatedNotes = await Notification.find({ recipient: asha._id, title: "Seat Allocation Updated" });
    check("42 seat updated notification leads to hall ticket action", updatedNotes.length >= 1 && updatedNotes.every((item) => String(item.referenceId) === String(scheduleId) && item.type === "exam"), String(updatedNotes.length));

    const quietBefore = await request("GET", `/api/hall-tickets/${quietId}`, { token: tokens.asha });
    check("quiet published paper without seating stays unavailable", quietBefore.status === 404 && quietBefore.data?.message === NO_PLAN, quietBefore.data?.message);
    await must("cancel version", "POST", `/api/schedules/${quietId}/new-version`, tokens.cell, { changeReason: "Examination cancelled for this paper" });
    await must("mark cancelled", "PUT", `/api/schedules/${quietId}/versions/2`, tokens.cell, { operationalChange: "cancelled" });
    await publishFlow(quietId);
    const cancelled = await request("GET", `/api/hall-tickets/${quietId}`, { token: tokens.asha });
    const stillCurrent = await request("GET", `/api/hall-tickets/${scheduleId}`, { token: tokens.asha });
    check("43 cancelled schedule does not generate an active hall ticket", cancelled.status === 409 && cancelled.data?.message === CANCELLED && !cancelled.text.startsWith("%PDF") && stillCurrent.status === 200 && stillCurrent.text.startsWith("%PDF"), cancelled.data?.message);

    const refreshed = await request("GET", `/api/hall-tickets/${scheduleId}`, { token: tokens.asha });
    const refreshedText = pdfPlain(refreshed.buffer);
    check("44 pdf download works after a fresh request", refreshed.status === 200 && refreshed.text.startsWith("%PDF") && refreshedText.includes("Asha Rao") && refreshedText.includes(seatAfter.seatNumber) && refreshed.disposition.includes("Hall_Ticket_STU001_BDA.pdf"), refreshed.disposition);

    const resultNote = await Notification.create({
        recipient: asha._id,
        title: "Result Published",
        message: "Your result is published.",
        type: "result",
        referenceId: asha._id,
        eventKey: `result-published-test:${asha._id}`
    });
    check("result notification is not a schedule reference", resultNote.type === "result" && String(resultNote.referenceId) !== String(scheduleId));

    const failed = results.filter((item) => !item.ok);
    console.log(`PHASE2_HALL_TICKET_CHECKS ${results.length - failed.length}/${results.length}`);
    if (failed.length) {
        server.close();
        await mongoose.disconnect();
        await memory.stop();
        process.exit(1);
    }

    if (process.env.HOLD === "1") {
        console.log(`HOLD http://127.0.0.1:${port}`);
        console.log(`SCHEDULE ${scheduleId}`);
        console.log(`QUIET ${quietId}`);
        console.log("asha.ht@example.com bima.ht@example.com cara.ht@example.com cell.ht@example.com dept.ht@example.com super.ht@example.com / password123");
        return;
    }

    server.close();
    await mongoose.disconnect();
    await memory.stop();
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
