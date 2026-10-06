/**
 * Phase 2.3 invigilation checks against an in-memory database.
 */
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");

process.env.JWT_SECRET = process.env.JWT_SECRET || "invigilation-check-secret";

const User = require("../models/User");
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
    const facultyA = await createUser({ name: "Faculty A", email: "faculty.a@example.com", role: "faculty" });
    const facultyB = await createUser({ name: "Faculty B", email: "faculty.b@example.com", role: "faculty" });
    const facultyC = await createUser({ name: "Faculty C", email: "faculty.c@example.com", role: "faculty" });
    const facultyD = await createUser({ name: "Faculty D", email: "faculty.d@example.com", role: "faculty", status: "inactive" });
    const student = await createUser({ name: "Student", email: "student@example.com", role: "student", studentId: "S1" });
    const studentTwo = await createUser({ name: "Student Two", email: "student2@example.com", role: "student", studentId: "S2" });
    const studentThree = await createUser({ name: "Student Three", email: "student3@example.com", role: "student", studentId: "S3" });
    const tokens = {
        super: tokenFor(superAdmin),
        cell: tokenFor(examCell),
        dept: tokenFor(deptAdmin),
        a: tokenFor(facultyA),
        b: tokenFor(facultyB),
        c: tokenFor(facultyC),
        d: tokenFor(facultyD),
        student: tokenFor(student)
    };

    const server = await new Promise((resolve) => {
        const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });
    port = server.address().port;

    const year = await request("POST", "/api/academic-years", {
        token: tokens.super,
        body: { name: "2026-2027", startDate: "2026-07-01", endDate: "2027-06-30", isActive: true }
    });
    const cse = await request("POST", "/api/departments", { token: tokens.super, body: { name: "Computing", code: "CSE" } });
    const eee = await request("POST", "/api/departments", { token: tokens.super, body: { name: "Electrical", code: "EEE" } });
    await User.findByIdAndUpdate(deptAdmin._id, { departmentRef: cse.data.item._id });
    await User.findByIdAndUpdate(facultyA._id, { departmentRef: cse.data.item._id });
    await User.findByIdAndUpdate(facultyB._id, { departmentRef: cse.data.item._id });
    await User.findByIdAndUpdate(facultyC._id, { departmentRef: eee.data.item._id });
    await User.findByIdAndUpdate(facultyD._id, { departmentRef: cse.data.item._id });

    const program = await request("POST", "/api/programs", {
        token: tokens.super,
        body: { name: "BSc Computing", code: "BSC", department: cse.data.item._id, duration: 4 }
    });
    const batch = await request("POST", "/api/batches", {
        token: tokens.super,
        body: { name: "Batch 2026", academicYear: year.data.item._id, program: program.data.item._id, semester: 6 }
    });
    const batchTwo = await request("POST", "/api/batches", {
        token: tokens.super,
        body: { name: "Batch 2025", academicYear: year.data.item._id, program: program.data.item._id, semester: 6 }
    });
    const section = await request("POST", "/api/sections", {
        token: tokens.super,
        body: { name: "A", batch: batch.data.item._id }
    });
    const sectionTwo = await request("POST", "/api/sections", {
        token: tokens.super,
        body: { name: "B", batch: batchTwo.data.item._id }
    });
    const sessions = await request("GET", "/api/sessions?limit=20", { token: tokens.cell });
    const morning = (sessions.data.items || []).find((item) => item.code === "MORNING");
    const overlap = await request("POST", "/api/sessions", {
        token: tokens.cell,
        body: { name: "Late Morning", code: "LATE", reportingTime: "10:30", startTime: "11:00", endTime: "13:00", duration: 120 }
    });
    const types = await request("GET", "/api/exam-types?limit=20", { token: tokens.cell });
    const subject = await request("POST", "/api/subjects", {
        token: tokens.cell,
        body: { code: "BDA", name: "Big Data Analytics", subjectType: "theory", department: cse.data.item._id, program: program.data.item._id, semester: 6, duration: 180 }
    });
    const subjectTwo = await request("POST", "/api/subjects", {
        token: tokens.cell,
        body: { code: "OS", name: "Operating Systems", subjectType: "theory", department: cse.data.item._id, program: program.data.item._id, semester: 6, duration: 180 }
    });
    const subjectThree = await request("POST", "/api/subjects", {
        token: tokens.cell,
        body: { code: "CN", name: "Computer Networks", subjectType: "theory", department: cse.data.item._id, program: program.data.item._id, semester: 6, duration: 180 }
    });
    await request("PATCH", `/api/subjects/${subject.data.item._id}/verification`, { token: tokens.dept, body: { verificationStatus: "verified" } });
    await request("PATCH", `/api/subjects/${subjectTwo.data.item._id}/verification`, { token: tokens.dept, body: { verificationStatus: "verified" } });
    await request("PATCH", `/api/subjects/${subjectThree.data.item._id}/verification`, { token: tokens.dept, body: { verificationStatus: "verified" } });

    for (const person of [student, studentTwo]) {
        await request("POST", "/api/enrollments", {
            token: tokens.cell,
            body: { student: person._id, program: program.data.item._id, batch: batch.data.item._id, section: section.data.item._id, academicYear: year.data.item._id, semester: 6 }
        });
    }
    await request("POST", "/api/enrollments", {
        token: tokens.cell,
        body: { student: studentThree._id, program: program.data.item._id, batch: batchTwo.data.item._id, section: sectionTwo.data.item._id, academicYear: year.data.item._id, semester: 6 }
    });
    for (const person of [student, studentTwo]) {
        for (const paper of [subject, subjectThree]) {
            await request("POST", "/api/registrations", {
                token: tokens.cell,
                body: { student: person._id, subject: paper.data.item._id, academicYear: year.data.item._id, semester: 6, registrationStatus: "registered" }
            });
        }
    }
    await request("POST", "/api/registrations", {
        token: tokens.cell,
        body: { student: studentThree._id, subject: subjectTwo.data.item._id, academicYear: year.data.item._id, semester: 6, registrationStatus: "registered" }
    });

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
            sessions: [morning._id, overlap.data.item._id],
            eligibleBatches: [batch.data.item._id]
        }
    });
    await request("POST", "/api/eligibility/calculate", {
        token: tokens.cell,
        body: { examination: examination.data.exam._id, subject: subject.data.item._id }
    });
    const examinationTwo = await request("POST", "/api/exams", {
        token: tokens.cell,
        body: {
            examinationSetup: true,
            title: "MID 2",
            examType: types.data.items.find((item) => item.code === "MID")._id,
            academicYear: year.data.item._id,
            department: cse.data.item._id,
            program: program.data.item._id,
            semester: 6,
            startDate: "2026-10-01",
            endDate: "2026-10-31",
            sessions: [overlap.data.item._id],
            eligibleBatches: [batchTwo.data.item._id]
        }
    });
    await request("POST", "/api/eligibility/calculate", {
        token: tokens.cell,
        body: { examination: examinationTwo.data.exam._id, subject: subjectTwo.data.item._id }
    });
    await request("POST", "/api/eligibility/calculate", {
        token: tokens.cell,
        body: { examination: examination.data.exam._id, subject: subjectThree.data.item._id }
    });

    const smallA = await request("POST", "/api/rooms", {
        token: tokens.cell,
        body: { roomNumber: "C-001", building: "C-25", floor: "1", capacity: 1, roomType: "hall" }
    });
    const smallB = await request("POST", "/api/rooms", {
        token: tokens.cell,
        body: { roomNumber: "C-002", building: "C-25", floor: "1", capacity: 1, roomType: "hall" }
    });
    const multi = await request("POST", "/api/schedules", {
        token: tokens.cell,
        body: { examination: examination.data.exam._id, subject: subject.data.item._id, date: "2026-10-08", session: morning._id, status: "draft" }
    });
    const allocated = await request("POST", "/api/room-allocations", { token: tokens.cell, body: { schedule: multi.data.item._id } });
    check("two rooms allocated", allocated.status === 201 && allocated.data.rooms?.length === 2, JSON.stringify(allocated.data?.rooms || allocated.data));
    const hall = await request("POST", "/api/rooms", {
        token: tokens.cell,
        body: { roomNumber: "H-1", building: "C-25", floor: "2", capacity: 40, roomType: "hall" }
    });
    const roomOne = (allocated.data.rooms || []).find((room) => room.roomNumber === "C-001")?.room;
    const roomTwo = (allocated.data.rooms || []).find((room) => room.roomNumber === "C-002")?.room;
    const publishedMulti = await request("PUT", `/api/schedules/${multi.data.item._id}`, {
        token: tokens.cell,
        body: { status: "scheduled", room: hall.data.item._id }
    });
    check("multi-room schedule can be published", publishedMulti.status === 200, JSON.stringify(publishedMulti.data?.message || publishedMulti.data));

    const deniedStudent = await request("GET", "/api/invigilation/workload", { token: tokens.student });
    const deniedFaculty = await request("POST", "/api/invigilation", {
        token: tokens.a,
        body: { schedule: multi.data.item._id, room: smallA.data.item._id, faculty: facultyA._id }
    });
    const deniedDept = await request("POST", "/api/invigilation", {
        token: tokens.dept,
        body: { schedule: multi.data.item._id, room: smallA.data.item._id, faculty: facultyA._id }
    });
    check("student cannot access invigilation", deniedStudent.status === 403, String(deniedStudent.status));
    check("faculty cannot create a duty", deniedFaculty.status === 403, String(deniedFaculty.status));
    check("department admin cannot allocate invigilators", deniedDept.status === 403, String(deniedDept.status));

    const draft = await request("POST", "/api/schedules", {
        token: tokens.cell,
        body: { examination: examination.data.exam._id, subject: subjectThree.data.item._id, date: "2026-10-09", session: morning._id, room: hall.data.item._id, status: "draft" }
    });
    const draftDuty = await request("POST", "/api/invigilation", {
        token: tokens.cell,
        body: { schedule: draft.data.item._id, room: hall.data.item._id, faculty: facultyC._id }
    });
    const draftNotes = await request("GET", "/api/notifications", { token: tokens.c });
    check("draft assignment creates no duty notification", draftDuty.status === 201 && countTitle(draftNotes, "Invigilation Duty Assigned") === 0, JSON.stringify(titles(draftNotes)));

    const assigned = await request("POST", "/api/invigilation", {
        token: tokens.cell,
        body: { schedule: multi.data.item._id, room: roomOne, faculty: facultyA._id }
    });
    const noteA = await request("GET", "/api/notifications", { token: tokens.a });
    const assignedMessage = (noteA.data.notifications || []).find((item) => item.title === "Invigilation Duty Assigned")?.message || "";
    check("examination cell can assign faculty", assigned.status === 201, JSON.stringify(assigned.data));
    check(
        "assignment notification uses the schedule",
        countTitle(noteA, "Invigilation Duty Assigned") === 1
            && assignedMessage.includes("MID - Big Data Analytics")
            && assignedMessage.includes("08 Oct 2026")
            && assignedMessage.includes("Morning Session")
            && assignedMessage.includes("Reporting: 08:30")
            && assignedMessage.includes("Room: C-001")
            && assignedMessage.includes("Building: C-25"),
        assignedMessage
    );

    const duplicate = await request("POST", "/api/invigilation", {
        token: tokens.cell,
        body: { schedule: multi.data.item._id, room: roomOne, faculty: facultyA._id }
    });
    const noteARepeat = await request("GET", "/api/notifications", { token: tokens.a });
    check("duplicate assignment is rejected", duplicate.status === 409, JSON.stringify(duplicate.data));
    check("duplicate assignment does not duplicate the notification", countTitle(noteARepeat, "Invigilation Duty Assigned") === 1);

    const mine = await request("GET", "/api/invigilation/faculty/me", { token: tokens.a });
    const otherMine = await request("GET", "/api/invigilation/faculty/me", { token: tokens.b });
    const otherById = await request("GET", `/api/invigilation/faculty/${facultyA._id}`, { token: tokens.b });
    check("faculty sees only their own duty", (mine.data.items || []).length === 1 && mine.data.items[0].room.roomNumber === "C-001", JSON.stringify(mine.data.items));
    check("another faculty does not receive that duty", (otherMine.data.items || []).every((item) => String(item.faculty._id) !== String(facultyA._id)), JSON.stringify(otherMine.data.items));
    check("faculty cannot read another faculty member's duties", otherById.status === 403, String(otherById.status));

    const facultyEdit = await request("PUT", `/api/invigilation/${assigned.data.item._id}`, {
        token: tokens.b,
        body: { room: roomTwo }
    });
    check("faculty cannot modify a duty", facultyEdit.status === 403, String(facultyEdit.status));

    const superAssign = await request("POST", "/api/invigilation", {
        token: tokens.super,
        body: { schedule: multi.data.item._id, room: roomTwo, faculty: facultyB._id }
    });
    check("super admin can assign faculty", superAssign.status === 201, JSON.stringify(superAssign.data?.message));
    await request("DELETE", `/api/invigilation/${superAssign.data.item._id}`, { token: tokens.super });

    const unavailable = await request("PUT", "/api/invigilation/availability", {
        token: tokens.c,
        body: { date: "2026-10-08", session: morning._id, available: false, reason: "Unavailable for Morning Session" }
    });
    const blockedUnavailable = await request("POST", "/api/invigilation", {
        token: tokens.cell,
        body: { schedule: multi.data.item._id, room: roomTwo, faculty: facultyC._id }
    });
    check("faculty can record unavailability", unavailable.status === 200, JSON.stringify(unavailable.data));
    check("unavailable faculty cannot be assigned", blockedUnavailable.status === 409 && /Unavailable for Morning Session/.test(blockedUnavailable.data?.message || ""), JSON.stringify(blockedUnavailable.data));

    const cross = await request("POST", "/api/invigilation/preview", {
        token: tokens.cell,
        body: { schedule: multi.data.item._id, room: roomTwo, faculty: facultyC._id }
    });
    await request("PUT", "/api/invigilation/availability", {
        token: tokens.cell,
        body: { faculty: facultyC._id, date: "2026-10-08", session: morning._id, available: true }
    });
    const crossOpen = await request("POST", "/api/invigilation/preview", {
        token: tokens.cell,
        body: { schedule: multi.data.item._id, room: roomTwo, faculty: facultyC._id }
    });
    const crossForced = await request("POST", "/api/invigilation", {
        token: tokens.cell,
        body: { schedule: multi.data.item._id, room: roomTwo, faculty: facultyC._id, sameDepartmentOnly: true }
    });
    check("department mismatch is explained", (cross.data.reasons || []).some((item) => item.code === "department"), JSON.stringify(cross.data.reasons));
    check("cross-department faculty can be previewed when allowed", crossOpen.status === 200 && crossOpen.data.ok === true, JSON.stringify(crossOpen.data));
    check("same-department rule rejects an outside faculty member", crossForced.status === 409 && /Department restriction/.test(crossForced.data?.message || ""), JSON.stringify(crossForced.data));

    const inactive = await request("POST", "/api/invigilation", {
        token: tokens.cell,
        body: { schedule: multi.data.item._id, room: roomTwo, faculty: facultyD._id }
    });
    check("inactive faculty cannot be assigned", inactive.status === 409 && /Inactive Faculty/.test(inactive.data?.message || ""), JSON.stringify(inactive.data));

    const double = await request("POST", "/api/invigilation", {
        token: tokens.cell,
        body: { schedule: multi.data.item._id, room: roomTwo, faculty: facultyA._id }
    });
    check("double allocation is rejected", double.status === 409 && /Overlapping duty/.test(double.data?.message || "") && /C-001/.test(double.data?.message || ""), JSON.stringify(double.data));

    const hallTwo = await request("POST", "/api/rooms", {
        token: tokens.cell,
        body: { roomNumber: "H-2", building: "C-25", floor: "3", capacity: 40, roomType: "hall" }
    });
    const other = await request("POST", "/api/schedules", {
        token: tokens.cell,
        body: { examination: examinationTwo.data.exam._id, subject: subjectTwo.data.item._id, date: "2026-10-08", session: overlap.data.item._id, room: hallTwo.data.item._id, status: "scheduled" }
    });
    const overlapping = await request("POST", "/api/invigilation", {
        token: tokens.cell,
        body: { schedule: other.data?.item?._id, room: hallTwo.data.item._id, faculty: facultyA._id }
    });
    check("overlapping duty is rejected", other.status === 201 && overlapping.status === 409 && /Overlapping duty/.test(overlapping.data?.message || ""), JSON.stringify({ other: other.status, overlapping: overlapping.data }));

    const wrongRoom = await request("POST", "/api/invigilation", {
        token: tokens.cell,
        body: { schedule: multi.data.item._id, room: hallTwo.data.item._id, faculty: facultyB._id }
    });
    check("room must belong to the schedule", wrongRoom.status === 400, JSON.stringify(wrongRoom.data));

    const generated = await request("POST", "/api/invigilation/generate", {
        token: tokens.cell,
        body: { schedule: other.data.item._id }
    });
    const recommendation = (generated.data.rows || [])[0];
    check(
        "balanced allocation prefers the lower workload",
        generated.status === 200 && recommendation?.faculty?.name === "Faculty B",
        JSON.stringify(recommendation)
    );

    const previewB = await request("POST", "/api/invigilation/preview", {
        token: tokens.cell,
        body: { schedule: other.data.item._id, room: hallTwo.data.item._id, faculty: facultyB._id }
    });
    const taken = await request("POST", "/api/invigilation", {
        token: tokens.cell,
        body: { schedule: multi.data.item._id, room: roomTwo, faculty: facultyB._id }
    });
    const stale = await request("POST", "/api/invigilation", {
        token: tokens.cell,
        body: { schedule: other.data.item._id, room: hallTwo.data.item._id, faculty: facultyB._id }
    });
    check("preview reports an available faculty member", previewB.status === 200 && previewB.data.ok === true, JSON.stringify(previewB.data));
    check("confirm revalidates a stale preview", taken.status === 201 && stale.status === 409, JSON.stringify(stale.data));

    const board = await request("GET", `/api/invigilation/schedule/${multi.data.item._id}`, { token: tokens.cell });
    const workloadBefore = await request("GET", "/api/invigilation/workload", { token: tokens.cell });
    const rowA = (workloadBefore.data.items || []).find((item) => item.faculty.name === "Faculty A");
    check("schedule board shows the assignment", (board.data.rooms || []).some((room) => room.assignment?.faculty?.name === "Faculty A"), JSON.stringify(board.data.rooms?.map((room) => room.assignment?.faculty?.name)));
    check("workload counts assigned duties", rowA && rowA.assignedDuties >= 1 && rowA.upcomingDuties >= 1, JSON.stringify(rowA));

    const deptWorkload = await request("GET", "/api/invigilation/workload", { token: tokens.dept });
    check(
        "department admin sees only their department",
        deptWorkload.status === 200 && (deptWorkload.data.items || []).every((item) => !item.department || item.department.code === "CSE"),
        JSON.stringify((deptWorkload.data.items || []).map((item) => item.department?.code))
    );

    await request("DELETE", `/api/invigilation/${taken.data.item._id}`, { token: tokens.cell });
    const movedOk = await request("PUT", `/api/invigilation/${assigned.data.item._id}`, {
        token: tokens.cell,
        body: { room: roomTwo }
    });
    const noteMovedOk = await request("GET", "/api/notifications", { token: tokens.a });
    const changeMessage = (noteMovedOk.data.notifications || []).find((item) => item.title === "Invigilation Duty Changed")?.message || "";
    check("duty update can move a faculty member to an open room", movedOk.status === 200 && movedOk.data.item.room.roomNumber === "C-002", JSON.stringify(movedOk.data));
    check("room change creates one duty notification", changeMessage.includes("from C-001 to C-002") && countTitle(noteMovedOk, "Invigilation Duty Changed") === 1, changeMessage);

    const removed = await request("DELETE", `/api/invigilation/${assigned.data.item._id}`, { token: tokens.cell });
    const afterRemove = await request("GET", "/api/invigilation/faculty/me", { token: tokens.a });
    const workloadAfter = await request("GET", "/api/invigilation/workload", { token: tokens.cell });
    const rowAfter = (workloadAfter.data.items || []).find((item) => item.faculty.name === "Faculty A");
    const cancelNotes = await request("GET", "/api/notifications", { token: tokens.a });
    check("duty removal cancels the assignment", removed.status === 200, JSON.stringify(removed.data));
    check("removed duty leaves the active faculty list", (afterRemove.data.items || []).every((item) => item.status !== "assigned"), JSON.stringify(afterRemove.data.items));
    check("workload drops after removal", rowAfter && rowAfter.assignedDuties === 0, JSON.stringify(rowAfter));
    check("cancellation notifies the faculty member", countTitle(cancelNotes, "Invigilation Duty Cancelled") === 1, JSON.stringify(titles(cancelNotes)));

    const fresh = await request("POST", "/api/invigilation", {
        token: tokens.cell,
        body: { schedule: multi.data.item._id, room: roomOne, faculty: facultyA._id }
    });
    const completed = await request("PUT", `/api/invigilation/${fresh.data.item._id}`, {
        token: tokens.cell,
        body: { status: "completed" }
    });
    const history = await request("GET", "/api/invigilation/faculty/me", { token: tokens.a });
    const completedRow = (workloadAfter && await request("GET", "/api/invigilation/workload", { token: tokens.cell })).data.items.find((item) => item.faculty.name === "Faculty A");
    check("completed duty remains queryable", completed.status === 200 && (history.data.items || []).some((item) => item.status === "completed"), JSON.stringify(history.data.items));
    check("completed duty is counted separately", completedRow.completedDuties === 1 && completedRow.assignedDuties === 0, JSON.stringify(completedRow));

    const published = await request("PUT", `/api/schedules/${draft.data.item._id}`, {
        token: tokens.cell,
        body: { status: "scheduled", room: hall.data.item._id }
    });
    const publishedNotes = await request("GET", "/api/notifications", { token: tokens.c });
    const publishedAgain = await request("PUT", `/api/schedules/${draft.data.item._id}`, {
        token: tokens.cell,
        body: { status: "scheduled", room: hall.data.item._id, date: "2026-10-09" }
    });
    const publishedNotesAgain = await request("GET", "/api/notifications", { token: tokens.c });
    check("publishing a schedule notifies the assigned faculty once", published.status === 200 && countTitle(publishedNotes, "Invigilation Duty Assigned") === 1, JSON.stringify(titles(publishedNotes)));
    check("repeating publication does not duplicate the duty notification", publishedAgain.status === 200 && countTitle(publishedNotesAgain, "Invigilation Duty Assigned") === 1, JSON.stringify(titles(publishedNotesAgain)));

    const failed = results.filter((item) => !item.ok);
    console.log(`PHASE2_INVIGILATION_CHECKS ${results.length - failed.length}/${results.length}`);
    if (failed.length) {
        server.close();
        await mongoose.disconnect();
        if (memory) await memory.stop();
        process.exit(1);
    }

    if (process.env.HOLD === "1") {
        console.log(`HOLD http://127.0.0.1:${port}`);
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
