/**
 * User-specific examination notification checks.
 * Uses an in-memory database unless USE_MEMORY is unset and MONGODB_URI is set.
 */
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const express = require("express");

process.env.JWT_SECRET = process.env.JWT_SECRET || "notification-check-secret";

const User = require("../models/User");
const { ensureCatalog } = require("../services/catalogSeed");
const { createNotification } = require("../services/notificationEvents");

const tokenFor = (user) => jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET
);

const startMemory = async () => {
    const { MongoMemoryServer } = require("/tmp/mongotest/node_modules/mongodb-memory-server");
    return MongoMemoryServer.create();
};

const cors = require("cors");
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
[
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
    ["/api/seating-plans", "../routes/seatingRoutes"],
    ["/api/results", "../routes/resultRoutes"],
    ["/api/auth", "../routes/authRoutes"],
    ["/api/profile", "../routes/profileRoutes"],
    ["/api/announcements", "../routes/announcementRoutes"],
    ["/api/notifications", "../routes/notificationRoutes"],
    ["/api/dashboard", "../routes/dashboardRoutes"],
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
    try {
        data = await response.json();
    } catch {
        data = null;
    }
    return { status: response.status, data };
};

let port = 0;

const titles = (response) => (response.data?.notifications || []).map((item) => item.title);
const countTitle = (response, title) => titles(response).filter((item) => item === title).length;

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
    const createUser = (fields) => User.create({ password, status: "active", ...fields });
    const superAdmin = await createUser({ name: "Super Admin", email: "super@example.com", role: "super_admin" });
    const examCell = await createUser({ name: "Exam Cell", email: "cell@example.com", role: "examination_cell" });
    const deptAdmin = await createUser({ name: "Dept Admin", email: "dept@example.com", role: "department_admin" });
    const faculty = await createUser({ name: "Faculty", email: "faculty@example.com", role: "faculty" });
    const studentA = await createUser({ name: "Student A", email: "a@example.com", role: "student", studentId: "A1" });
    const studentB = await createUser({ name: "Student B", email: "b@example.com", role: "student", studentId: "B1" });
    const studentC = await createUser({ name: "Student C", email: "c@example.com", role: "student", studentId: "C1" });
    const studentD = await createUser({ name: "Student D", email: "d@example.com", role: "student", studentId: "D1" });
    const tokens = {
        super: tokenFor(superAdmin),
        cell: tokenFor(examCell),
        dept: tokenFor(deptAdmin),
        faculty: tokenFor(faculty),
        a: tokenFor(studentA),
        b: tokenFor(studentB),
        c: tokenFor(studentC),
        d: tokenFor(studentD)
    };

    const server = await new Promise((resolve) => {
        const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });
    port = server.address().port;

    const year = await request("POST", "/api/academic-years", {
        token: tokens.super,
        body: { name: "2026-2027", startDate: "2026-07-01", endDate: "2027-06-30", isActive: true }
    });
    const dept = await request("POST", "/api/departments", {
        token: tokens.super,
        body: { name: "Computing", code: "CSE" }
    });
    await User.findByIdAndUpdate(deptAdmin._id, { departmentRef: dept.data.item._id });
    const program = await request("POST", "/api/programs", {
        token: tokens.super,
        body: { name: "BSc Computing", code: "BSC", department: dept.data.item._id, duration: 4 }
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
    const types = await request("GET", "/api/exam-types?limit=50", { token: tokens.cell });
    const subject = await request("POST", "/api/subjects", {
        token: tokens.cell,
        body: {
            code: "BDA",
            name: "Big Data Analytics",
            subjectType: "theory",
            department: dept.data.item._id,
            program: program.data.item._id,
            semester: 6,
            duration: 180
        }
    });
    await request("PATCH", `/api/subjects/${subject.data.item._id}/verification`, {
        token: tokens.dept,
        body: { verificationStatus: "verified" }
    });

    for (const student of [studentA, studentB, studentC, studentD]) {
        await request("POST", "/api/enrollments", {
            token: tokens.cell,
            body: {
                student: student._id,
                program: program.data.item._id,
                batch: batch.data.item._id,
                section: section.data.item._id,
                academicYear: year.data.item._id,
                semester: 6
            }
        });
    }

    for (const student of [studentA, studentB, studentC]) {
        await request("POST", "/api/registrations", {
            token: tokens.cell,
            body: {
                student: student._id,
                subject: subject.data.item._id,
                academicYear: year.data.item._id,
                semester: 6,
                registrationStatus: "registered"
            }
        });
    }

    const examination = await request("POST", "/api/exams", {
        token: tokens.cell,
        body: {
            examinationSetup: true,
            title: "MID",
            examType: types.data.items.find((item) => item.code === "MID")._id,
            academicYear: year.data.item._id,
            department: dept.data.item._id,
            program: program.data.item._id,
            semester: 6,
            startDate: "2026-10-01",
            endDate: "2026-10-31",
            sessions: [morning._id],
            eligibleBatches: [batch.data.item._id],
            instructions: "Bring the admit card."
        }
    });
    const eligibility = await request("POST", "/api/eligibility/calculate", {
        token: tokens.cell,
        body: { examination: examination.data.exam._id, subject: subject.data.item._id }
    });
    check(
        "eligible snapshot includes three registered students and one blocked student",
        eligibility.status === 200
            && eligibility.data.counts.registered === 3
            && eligibility.data.counts.blocked === 1,
        JSON.stringify(eligibility.data?.counts)
    );

    const room = await request("POST", "/api/rooms", {
        token: tokens.cell,
        body: { roomNumber: "C-001", building: "C-25", floor: "1", capacity: 40, roomType: "hall" }
    });
    const otherRoom = await request("POST", "/api/rooms", {
        token: tokens.cell,
        body: { roomNumber: "C-002", building: "C-25", floor: "1", capacity: 40, roomType: "hall" }
    });

    const draft = await request("POST", "/api/schedules", {
        token: tokens.cell,
        body: {
            examination: examination.data.exam._id,
            subject: subject.data.item._id,
            date: "2026-10-08",
            session: morning._id,
            status: "draft"
        }
    });
    check("draft schedule saved", draft.status === 201 && draft.data.item.status === "draft", JSON.stringify(draft.data));
    const afterDraft = await request("GET", "/api/notifications", { token: tokens.a });
    check("draft schedule creates no publication notification", afterDraft.status === 200 && titles(afterDraft).length === 0, JSON.stringify(titles(afterDraft)));

    const published = await request("PUT", `/api/schedules/${draft.data.item._id}`, {
        token: tokens.cell,
        body: { status: "scheduled", room: room.data.item._id }
    });
    check("schedule publication saved", published.status === 200 && published.data.item.status === "scheduled", JSON.stringify(published.data?.message));

    const noteA = await request("GET", "/api/notifications", { token: tokens.a });
    const noteB = await request("GET", "/api/notifications", { token: tokens.b });
    const noteC = await request("GET", "/api/notifications", { token: tokens.c });
    const noteD = await request("GET", "/api/notifications", { token: tokens.d });
    const publishedMessage = (noteA.data.notifications || [])[0]?.message || "";
    check("student A receives one publication notification", countTitle(noteA, "Examination Schedule Published") === 1, JSON.stringify(titles(noteA)));
    check("student B receives one publication notification", countTitle(noteB, "Examination Schedule Published") === 1, JSON.stringify(titles(noteB)));
    check("student C receives one publication notification", countTitle(noteC, "Examination Schedule Published") === 1, JSON.stringify(titles(noteC)));
    check("ineligible student D receives nothing", titles(noteD).length === 0, JSON.stringify(titles(noteD)));
    check(
        "publication message uses the real schedule",
        publishedMessage.includes("MID - Big Data Analytics")
            && publishedMessage.includes("08 Oct 2026")
            && publishedMessage.includes("09:00 - 12:00")
            && publishedMessage.includes("Reporting: 08:30")
            && publishedMessage.includes("Building: C-25")
            && publishedMessage.includes("Room: C-001")
            && !publishedMessage.includes("N/A"),
        publishedMessage
    );
    check(
        "publication recipient is student A",
        String(noteA.data.notifications[0].recipient) === String(studentA._id),
        String(noteA.data.notifications[0]?.recipient)
    );

    const repeated = await request("PUT", `/api/schedules/${draft.data.item._id}`, {
        token: tokens.cell,
        body: { status: "scheduled", room: room.data.item._id, date: "2026-10-08", session: morning._id }
    });
    const noteARepeat = await request("GET", "/api/notifications", { token: tokens.a });
    check("repeated publication does not duplicate", repeated.status === 200 && countTitle(noteARepeat, "Examination Schedule Published") === 1, JSON.stringify(titles(noteARepeat)));

    const moved = await request("PUT", `/api/schedules/${draft.data.item._id}`, {
        token: tokens.cell,
        body: { room: otherRoom.data.item._id }
    });
    const noteARoom = await request("GET", "/api/notifications", { token: tokens.a });
    const noteDRoom = await request("GET", "/api/notifications", { token: tokens.d });
    const roomMessage = (noteARoom.data.notifications || []).find((item) => item.title === "Examination Room Changed")?.message || "";
    check("room change saved", moved.status === 200, JSON.stringify(moved.data?.message));
    check("room change notifies the eligible student once", countTitle(noteARoom, "Examination Room Changed") === 1, JSON.stringify(titles(noteARoom)));
    check("room change message names both rooms", roomMessage.includes("from C-001 to C-002"), roomMessage);
    check("room change does not notify the ineligible student", countTitle(noteDRoom, "Examination Room Changed") === 0, JSON.stringify(titles(noteDRoom)));

    const movedAgain = await request("PUT", `/api/schedules/${draft.data.item._id}`, {
        token: tokens.cell,
        body: { room: otherRoom.data.item._id }
    });
    const noteARoomAgain = await request("GET", "/api/notifications", { token: tokens.a });
    check("repeated room change does not duplicate", movedAgain.status === 200 && countTitle(noteARoomAgain, "Examination Room Changed") === 1, JSON.stringify(titles(noteARoomAgain)));

    const rescheduled = await request("PUT", `/api/schedules/${draft.data.item._id}`, {
        token: tokens.cell,
        body: { date: "2026-10-10" }
    });
    const noteADate = await request("GET", "/api/notifications", { token: tokens.a });
    const dateMessage = (noteADate.data.notifications || []).find((item) => item.title === "Examination Rescheduled")?.message || "";
    check("reschedule saved", rescheduled.status === 200, JSON.stringify(rescheduled.data?.message));
    check("reschedule notifies the eligible student once", countTitle(noteADate, "Examination Rescheduled") === 1, JSON.stringify(titles(noteADate)));
    check("reschedule message uses the new date", dateMessage.includes("10 Oct 2026") && dateMessage.includes("09:00 - 12:00"), dateMessage);

    const rescheduledAgain = await request("PUT", `/api/schedules/${draft.data.item._id}`, {
        token: tokens.cell,
        body: { date: "2026-10-10" }
    });
    const noteADateAgain = await request("GET", "/api/notifications", { token: tokens.a });
    check("repeated reschedule does not duplicate", rescheduledAgain.status === 200 && countTitle(noteADateAgain, "Examination Rescheduled") === 1);

    const seating = await request("POST", "/api/seating-plans", {
        token: tokens.cell,
        body: { schedule: draft.data.item._id, strategy: "ROLL_NUMBER" }
    });
    const noteASeat = await request("GET", "/api/notifications", { token: tokens.a });
    const noteDSeat = await request("GET", "/api/notifications", { token: tokens.d });
    const seatMessage = (noteASeat.data.notifications || []).find((item) => item.title === "Seat Allocation Published")?.message || "";
    check("seating published", seating.status === 201, JSON.stringify(seating.data?.message));
    check("seat publication notifies the seated student once", countTitle(noteASeat, "Seat Allocation Published") === 1, JSON.stringify(titles(noteASeat)));
    check("seat message includes room and seat", seatMessage.includes("Room: C-002") && /Seat: /.test(seatMessage), seatMessage);
    check("seat publication skips the ineligible student", countTitle(noteDSeat, "Seat Allocation Published") === 0);

    const seatingRepeat = await request("POST", "/api/seating-plans/regenerate", {
        token: tokens.cell,
        body: { schedule: draft.data.item._id, strategy: "ROLL_NUMBER" }
    });
    const noteASeatRepeat = await request("GET", "/api/notifications", { token: tokens.a });
    check(
        "same seating does not duplicate",
        seatingRepeat.status === 201
            && countTitle(noteASeatRepeat, "Seat Allocation Published") === 1
            && countTitle(noteASeatRepeat, "Seat Allocation Updated") === 0,
        JSON.stringify(titles(noteASeatRepeat))
    );

    const seatingChanged = await request("POST", "/api/seating-plans/regenerate", {
        token: tokens.cell,
        body: { schedule: draft.data.item._id, strategy: "ALTERNATE" }
    });
    const noteASeatChanged = await request("GET", "/api/notifications", { token: tokens.b });
    check("seat change saved", seatingChanged.status === 201, JSON.stringify(seatingChanged.data?.message));
    check(
        "changed seat notifies that student once",
        countTitle(noteASeatChanged, "Seat Allocation Updated") === 1
            && countTitle(noteASeatChanged, "Seat Allocation Published") === 1,
        JSON.stringify(titles(noteASeatChanged))
    );

    const createdResult = await request("POST", "/api/results", {
        token: tokens.super,
        body: { student: studentA._id, exam: examination.data.exam._id, marksObtained: 88, maximumMarks: 100 }
    });
    const beforePublish = await request("GET", "/api/notifications", { token: tokens.a });
    check("unpublished result creates no notification", createdResult.status === 201 && countTitle(beforePublish, "Result Published") === 0, JSON.stringify(createdResult.data));

    const resultPublish = await request("PATCH", `/api/results/${createdResult.data.result._id}/publish`, { token: tokens.super });
    const noteAResult = await request("GET", "/api/notifications", { token: tokens.a });
    const noteBResult = await request("GET", "/api/notifications", { token: tokens.b });
    const resultNote = (noteAResult.data.notifications || []).find((item) => item.title === "Result Published");
    check("result publication creates one notification", resultPublish.status === 200 && countTitle(noteAResult, "Result Published") === 1, JSON.stringify(titles(noteAResult)));
    check("result notification belongs to student A", resultNote && String(resultNote.recipient) === String(studentA._id) && resultNote.type === "result", JSON.stringify(resultNote));
    check("another student does not receive the result", countTitle(noteBResult, "Result Published") === 0, JSON.stringify(titles(noteBResult)));

    const resultPublishAgain = await request("PATCH", `/api/results/${createdResult.data.result._id}/publish`, { token: tokens.super });
    const noteAResultAgain = await request("GET", "/api/notifications", { token: tokens.a });
    check("repeated result publication does not duplicate", resultPublishAgain.status === 200 && countTitle(noteAResultAgain, "Result Published") === 1);

    const announcement = await request("POST", "/api/announcements", {
        token: tokens.super,
        body: { title: "DBMS Examination Notice", content: "General notice", targetAudience: "students", published: true }
    });
    const noteAfterAnnouncement = await request("GET", "/api/notifications", { token: tokens.a });
    const dashboard = await request("GET", "/api/dashboard/student", { token: tokens.a });
    check("announcement remains an announcement", announcement.status === 201, JSON.stringify(announcement.data?.message));
    check(
        "announcement is not copied into notifications",
        !titles(noteAfterAnnouncement).includes("DBMS Examination Notice")
            && !(dashboard.data.notifications || []).some((item) => item.title === "DBMS Examination Notice")
            && (dashboard.data.announcements || []).some((item) => item.title === "DBMS Examination Notice"),
        JSON.stringify({ notifications: titles(noteAfterAnnouncement), announcements: (dashboard.data.announcements || []).map((item) => item.title) })
    );
    check(
        "dashboard preview uses the same user notifications",
        (dashboard.data.notifications || []).some((item) => item.title === "Examination Schedule Published")
            && (dashboard.data.notifications || []).every((item) => String(item.recipient) === String(studentA._id)),
        JSON.stringify((dashboard.data.notifications || []).map((item) => item.title))
    );

    const readTarget = resultNote;
    const marked = await request("PATCH", `/api/notifications/${readTarget._id}/read`, { token: tokens.a });
    const refreshed = await request("GET", "/api/notifications", { token: tokenFor(studentA) });
    const refreshedNote = (refreshed.data.notifications || []).find((item) => String(item._id) === String(readTarget._id));
    check("mark as read persists for a new session", marked.status === 200 && refreshedNote?.isRead === true, JSON.stringify(refreshedNote));

    const stolen = await request("GET", `/api/notifications?recipient=${studentA._id}`, { token: tokens.b });
    check(
        "student B cannot read student A notifications",
        stolen.status === 200
            && !(stolen.data.notifications || []).some((item) => String(item.recipient) === String(studentA._id)),
        JSON.stringify((stolen.data.notifications || []).map((item) => item.recipient))
    );

    const duty = await createNotification({
        recipient: faculty._id,
        title: "Examination Duty Assigned",
        message: "Architecture check for a future faculty duty.",
        type: "exam",
        referenceId: draft.data.item._id,
        eventKey: `duty-foundation:${faculty._id}`
    });
    const facultyNotes = await request("GET", "/api/notifications", { token: tokens.faculty });
    const studentSeesDuty = await request("GET", "/api/notifications", { token: tokens.a });
    check("faculty recipient can receive an exam notification", duty === true && countTitle(facultyNotes, "Examination Duty Assigned") === 1);
    check("faculty notification is not delivered to a student", countTitle(studentSeesDuty, "Examination Duty Assigned") === 0);

    if (process.env.HOLD === "1") {
        console.log(`HOLD http://127.0.0.1:${port}`);
        return;
    }

    server.close();
    await mongoose.disconnect();
    if (memory) await memory.stop();

    const failed = results.filter((item) => !item.ok);
    console.log(`NOTIFICATION_CHECKS ${results.length - failed.length}/${results.length}`);
    if (failed.length) process.exit(1);
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
