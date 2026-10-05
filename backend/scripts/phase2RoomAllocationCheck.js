/**
 * Phase 2.1 automatic room allocation checks.
 * Uses an in-memory MongoDB server and does not touch production data.
 */
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const express = require("express");

process.env.JWT_SECRET = process.env.JWT_SECRET || "phase2-room-check";

const User = require("../models/User");
const Enrollment = require("../models/Enrollment");
const SubjectRegistration = require("../models/SubjectRegistration");
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
mount("/api/rooms", require("../routes/roomRoutes"));
mount("/api/room-allocations", require("../routes/roomAllocationRoutes"));
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
    let memory = null;
    memory = await startMemory();
    await mongoose.connect(memory.getUri());
    await ensureCatalog();

    const password = await bcrypt.hash("password123", 4);
    const superAdmin = await User.create({
        name: "Super Admin",
        email: "super-p2@example.com",
        password,
        role: "super_admin",
        status: "active"
    });
    const examCell = await User.create({
        name: "Exam Cell",
        email: "cell-p2@example.com",
        password,
        role: "examination_cell",
        status: "active"
    });
    const deptAdmin = await User.create({
        name: "Dept Admin",
        email: "dept-p2@example.com",
        password,
        role: "department_admin",
        status: "active"
    });
    const student = await User.create({
        name: "Student",
        email: "student-p2@example.com",
        password,
        role: "student",
        status: "active",
        studentId: "P2-STUDENT"
    });
    const cell = tokenFor(examCell);
    const superToken = tokenFor(superAdmin);
    const dept = tokenFor(deptAdmin);
    const studentToken = tokenFor(student);

    const must = async (name, method, urlPath, body) => {
        const response = await request(method, urlPath, { token: superToken, body });
        if (response.status >= 400) {
            throw new Error(`${name} ${response.status} ${JSON.stringify(response.data)}`);
        }
        return response.data;
    };

    const year = (await must("year", "POST", "/api/academic-years", {
        name: "2026-2027",
        startDate: "2026-06-01",
        endDate: "2027-05-31"
    })).item;
    const computing = (await must("computing", "POST", "/api/departments", {
        name: "Computing",
        code: "COMP"
    })).item;
    const electrical = (await must("electrical", "POST", "/api/departments", {
        name: "Electrical",
        code: "ELEC"
    })).item;
    const other = (await must("other", "POST", "/api/departments", {
        name: "Other",
        code: "OTHR"
    })).item;
    const compProgram = (await must("comp program", "POST", "/api/programs", {
        name: "BSc Computing",
        code: "BSC",
        department: computing._id,
        duration: 4
    })).item;
    const elecProgram = (await must("elec program", "POST", "/api/programs", {
        name: "BSc Electrical",
        code: "BSEE",
        department: electrical._id,
        duration: 4
    })).item;
    const compBatch = (await must("comp batch", "POST", "/api/batches", {
        name: "Comp 2026",
        academicYear: year._id,
        program: compProgram._id,
        semester: 6
    })).item;
    const elecBatch = (await must("elec batch", "POST", "/api/batches", {
        name: "Elec 2026",
        academicYear: year._id,
        program: elecProgram._id,
        semester: 6
    })).item;
    const compSection = (await must("comp section", "POST", "/api/sections", {
        name: "A",
        batch: compBatch._id
    })).item;
    const elecSection = (await must("elec section", "POST", "/api/sections", {
        name: "A",
        batch: elecBatch._id
    })).item;
    const morning = (await must("morning", "POST", "/api/sessions", {
        name: "Phase2 Morning",
        code: "P2MORN",
        reportingTime: "08:30",
        startTime: "09:00",
        endTime: "12:00"
    })).item;
    const afternoon = (await must("afternoon", "POST", "/api/sessions", {
        name: "Phase2 Afternoon",
        code: "P2AFT",
        reportingTime: "13:30",
        startTime: "14:00",
        endTime: "17:00"
    })).item;
    const types = await request("GET", "/api/exam-types", { token: superToken });
    const examType = types.data.items.find((item) => item.code === "END");

    const makeStudents = async (prefix, count, program, batch, section) => {
        const users = [];
        for (let index = 0; index < count; index += 1) {
            const user = await User.create({
                name: `${prefix} ${index}`,
                email: `${prefix}-${index}@example.com`,
                password,
                role: "student",
                status: "active",
                studentId: `${prefix}-${index}`
            });
            await Enrollment.create({
                student: user._id,
                program: program._id,
                batch: batch._id,
                section: section._id,
                academicYear: year._id,
                semester: 6,
                status: "active"
            });
            users.push(user);
        }
        return users;
    };

    const computingStudents = await makeStudents("comp", 50, compProgram, compBatch, compSection);
    const electricalStudents = await makeStudents("elec", 50, elecProgram, elecBatch, elecSection);

    const makeSubject = async (code, name, department, program) => {
        const created = await must(code, "POST", "/api/subjects", {
            code,
            name,
            subjectType: "theory",
            department: department._id,
            program: program._id,
            semester: 6,
            duration: 120
        });
        const verified = await request("PATCH", `/api/subjects/${created.item._id}/verification`, {
            token: superToken,
            body: { verificationStatus: "verified" }
        });
        if (verified.status !== 200) throw new Error(`verify ${code} ${JSON.stringify(verified.data)}`);
        return created.item;
    };

    const register = async (subject, students) => {
        await SubjectRegistration.insertMany(students.map((student) => ({
            student: student._id,
            subject: subject._id,
            academicYear: year._id,
            semester: 6,
            registrationStatus: "registered"
        })));
    };

    const makeExam = async (title, department, program, batch) => {
        const created = await must(title, "POST", "/api/exams", {
            examinationSetup: true,
            title,
            examType: examType._id,
            academicYear: year._id,
            department: department._id,
            program: program._id,
            semester: 6,
            startDate: "2026-11-01",
            endDate: "2026-11-30",
            reportingTime: "08:30",
            sessions: [morning._id, afternoon._id],
            eligibleBatches: [batch._id],
            instructions: "Bring the admit card."
        });
        return created.exam;
    };

    const compExam = await makeExam("Computing Exams", computing, compProgram, compBatch);
    const elecExam = await makeExam("Electrical Exams", electrical, elecProgram, elecBatch);

    const room = async (roomNumber, capacity, department, extra = {}) => {
        const created = await must(roomNumber, "POST", "/api/rooms", {
            roomNumber,
            building: "Block",
            floor: "1",
            capacity,
            roomType: "classroom",
            department: department._id,
            ...extra
        });
        return created.item;
    };

    const room20a = await room("20A", 20, computing);
    const room20b = await room("20B", 20, computing);
    const room30 = await room("30", 30, computing);
    const room40a = await room("40A", 40, computing);
    const room40b = await room("40B", 40, computing);
    const otherSmall = await room("OTHER10", 10, other);
    const elec40 = await room("E40", 40, electrical);

    const subjectFor = async (code, name, students, department, program) => {
        const subject = await makeSubject(code, name, department, program);
        await register(subject, students);
        return subject;
    };

    const draft = async (title, exam, subject, date, session) => {
        const created = await must(title, "POST", "/api/schedules", {
            examination: exam._id,
            subject: subject._id,
            date,
            session: session._id,
            status: "draft"
        });
        return created.item;
    };

    const ten = await subjectFor("P2TEN", "Ten Students", computingStudents.slice(0, 10), computing, compProgram);
    const forty = await subjectFor("P2FORTY", "Forty Students", computingStudents.slice(0, 40), computing, compProgram);
    const fortyOne = await subjectFor("P2FORTY1", "Forty One Students", computingStudents.slice(0, 41), computing, compProgram);
    const fifty = await subjectFor("P2FIFTY", "Fifty Electrical", electricalStudents, electrical, elecProgram);
    const occupied = await subjectFor("P2OCC", "Occupied", computingStudents.slice(0, 10), computing, compProgram);
    const second = await subjectFor("P2OCC2", "Second Paper", computingStudents.slice(10, 20), computing, compProgram);
    const dated = await subjectFor("P2DATE", "Date Rule", computingStudents.slice(0, 10), computing, compProgram);
    const sessioned = await subjectFor("P2SESS", "Session Rule", computingStudents.slice(0, 10), computing, compProgram);
    const ruled = await subjectFor("P2RULE", "Department Rule", computingStudents.slice(0, 10), computing, compProgram);
    const manual = await subjectFor("P2MAN", "Manual Room", computingStudents.slice(0, 10), computing, compProgram);
    const recount = await subjectFor("P2COUNT", "Recount", computingStudents.slice(0, 10), computing, compProgram);

    const scheduleTen = await draft("ten", compExam, ten, "2026-11-02", morning);
    const previewTen = await request("POST", "/api/room-allocations/preview", {
        token: superToken,
        body: { schedule: scheduleTen._id }
    });
    check(
        "CASE 1 one room for 10 students",
        previewTen.status === 200 && previewTen.data.ok && previewTen.data.rooms.length === 1 && previewTen.data.students === 10 && previewTen.data.allocated === 10,
        JSON.stringify(previewTen.data)
    );
    const savedTen = await request("POST", "/api/room-allocations", {
        token: superToken,
        body: { schedule: scheduleTen._id }
    });
    check("CASE 1 allocation saved without replacing a manual room", savedTen.status === 201 && !scheduleTen.room, JSON.stringify(savedTen.data));

    const scheduleForty = await draft("forty", compExam, forty, "2026-11-03", morning);
    const previewForty = await request("POST", "/api/room-allocations/preview", {
        token: superToken,
        body: { schedule: scheduleForty._id }
    });
    check(
        "CASE 2 one exact room for 40 students",
        previewForty.status === 200 && previewForty.data.rooms.length === 1 && previewForty.data.capacity === 40 && previewForty.data.unused === 0,
        JSON.stringify(previewForty.data)
    );

    const scheduleFortyOne = await draft("fortyone", compExam, fortyOne, "2026-11-04", morning);
    const previewFortyOne = await request("POST", "/api/room-allocations/preview", {
        token: superToken,
        body: { schedule: scheduleFortyOne._id }
    });
    check(
        "CASE 3 multi-room allocation for 41 students",
        previewFortyOne.status === 200
            && previewFortyOne.data.ok
            && previewFortyOne.data.rooms.length === 2
            && previewFortyOne.data.allocated === 41
            && previewFortyOne.data.capacity === 50
            && previewFortyOne.data.unused === 9,
        JSON.stringify(previewFortyOne.data)
    );

    const scheduleFifty = await draft("fifty", elecExam, fifty, "2026-11-05", morning);
    const previewFifty = await request("POST", "/api/room-allocations/preview", {
        token: superToken,
        body: { schedule: scheduleFifty._id }
    });
    check(
        "CASE 4 insufficient capacity is rejected",
        previewFifty.status === 200
            && previewFifty.data.ok === false
            && previewFifty.data.message === "No combination of available rooms can accommodate 50 students for the selected session.",
        JSON.stringify(previewFifty.data)
    );

    const firstOcc = await draft("occupied", compExam, occupied, "2026-11-06", morning);
    const taken = await request("POST", "/api/room-allocations", {
        token: superToken,
        body: { schedule: firstOcc._id }
    });
    const takenRoom = taken.data.rooms?.[0]?.room;
    const secondOcc = await draft("second", compExam, second, "2026-11-06", morning);
    const previewSecond = await request("POST", "/api/room-allocations/preview", {
        token: superToken,
        body: { schedule: secondOcc._id }
    });
    check(
        "CASE 5 occupied room is excluded",
        taken.status === 201
            && previewSecond.data.ok
            && previewSecond.data.rooms.every((item) => String(item.room) !== String(takenRoom)),
        JSON.stringify({ taken: taken.data.rooms, second: previewSecond.data.rooms })
    );

    await request("PUT", `/api/rooms/${room20a._id}`, {
        token: superToken,
        body: { unavailableDates: ["2026-11-07"] }
    });
    const scheduleDate = await draft("date", compExam, dated, "2026-11-07", morning);
    const previewDate = await request("POST", "/api/room-allocations/preview", {
        token: superToken,
        body: { schedule: scheduleDate._id }
    });
    check(
        "CASE 6 room unavailable on the selected date is excluded",
        previewDate.data.ok && previewDate.data.rooms.every((item) => String(item.room) !== String(room20a._id)),
        JSON.stringify(previewDate.data.rooms)
    );

    await request("PUT", `/api/rooms/${room20a._id}`, {
        token: superToken,
        body: { unavailableSessions: [afternoon._id] }
    });
    const scheduleAfternoon = await draft("afternoon", compExam, sessioned, "2026-11-08", afternoon);
    const previewAfternoon = await request("POST", "/api/room-allocations/preview", {
        token: superToken,
        body: { schedule: scheduleAfternoon._id }
    });
    check(
        "CASE 7 room unavailable for the session is excluded",
        previewAfternoon.data.ok && previewAfternoon.data.rooms.every((item) => String(item.room) !== String(room20a._id)),
        JSON.stringify(previewAfternoon.data.rooms)
    );

    const scheduleRule = await draft("rule", compExam, ruled, "2026-11-09", morning);
    const previewRule = await request("POST", "/api/room-allocations/preview", {
        token: superToken,
        body: { schedule: scheduleRule._id }
    });
    check(
        "CASE 8 other-department room is excluded",
        previewRule.data.ok
            && previewRule.data.rooms.every((item) => String(item.room) !== String(otherSmall._id))
            && previewRule.data.rooms[0].capacity === 20,
        JSON.stringify(previewRule.data.rooms)
    );

    const manualSchedule = await must("manual schedule", "POST", "/api/schedules", {
        examination: compExam._id,
        subject: manual._id,
        date: "2026-11-10",
        session: morning._id,
        room: room40b._id,
        status: "scheduled"
    });
    const previewManual = await request("POST", "/api/room-allocations/preview", {
        token: superToken,
        body: { schedule: manualSchedule.item._id }
    });
    const confirmManual = await request("POST", "/api/room-allocations", {
        token: superToken,
        body: { schedule: manualSchedule.item._id }
    });
    const manualAfter = await request("GET", `/api/schedules/${manualSchedule.item._id}`, { token: cell });
    check(
        "CASE 9 manual room is not overwritten",
        previewManual.data.ok === false
            && previewManual.data.message === "This schedule already has a manual room assignment."
            && confirmManual.status === 409
            && String(manualAfter.data.item.room?._id || manualAfter.data.item.room) === String(room40b._id)
            && (manualAfter.data.allocations || []).length === 0,
        JSON.stringify({ preview: previewManual.data, confirm: confirmManual.status, room: manualAfter.data.item.room, allocations: manualAfter.data.allocations })
    );

    const recountSchedule = await draft("recount", compExam, recount, "2026-11-11", morning);
    const beforeCount = await request("POST", "/api/room-allocations/preview", {
        token: superToken,
        body: { schedule: recountSchedule._id }
    });
    await SubjectRegistration.create({
        student: computingStudents[10]._id,
        subject: recount._id,
        academicYear: year._id,
        semester: 6,
        registrationStatus: "registered"
    });
    const updated = await request("PUT", `/api/schedules/${recountSchedule._id}`, {
        token: superToken,
        body: {
            examination: compExam._id,
            subject: recount._id,
            date: "2026-11-11",
            session: morning._id,
            status: "draft"
        }
    });
    const afterCount = await request("POST", "/api/room-allocations/preview", {
        token: superToken,
        body: { schedule: recountSchedule._id }
    });
    check(
        "CASE 10 preview uses the current eligible snapshot",
        beforeCount.data.students === 10 && updated.status === 200 && afterCount.data.students === 11,
        JSON.stringify({ before: beforeCount.data.students, update: updated.status, after: afterCount.data.students, message: updated.data })
    );

    const deptPreview = await request("POST", "/api/room-allocations/preview", {
        token: dept,
        body: { schedule: scheduleTen._id }
    });
    check("CASE 11 department admin cannot allocate rooms", deptPreview.status === 403, String(deptPreview.status));

    const studentPreview = await request("POST", "/api/room-allocations/preview", {
        token: studentToken,
        body: { schedule: scheduleTen._id }
    });
    check("CASE 12 student cannot allocate rooms", studentPreview.status === 403, String(studentPreview.status));

    const failed = results.filter((item) => !item.ok);
    console.log(`PHASE2_ROOM_CHECKS ${results.length - failed.length}/${results.length}`);
    failed.forEach((item) => console.log(" -", item.name, item.detail));

    await mongoose.disconnect();
    if (memory) await memory.stop();
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
