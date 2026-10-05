/**
 * Phase 2.2 seating plan checks.
 * Uses an in-memory MongoDB server and does not touch production data.
 */
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const express = require("express");

process.env.JWT_SECRET = process.env.JWT_SECRET || "phase2-seating-check";

const User = require("../models/User");
const Enrollment = require("../models/Enrollment");
const SubjectRegistration = require("../models/SubjectRegistration");
const Schedule = require("../models/Schedule");
const RoomAllocation = require("../models/RoomAllocation");
const SeatingPlan = require("../models/SeatingPlan");
const SeatAllocation = require("../models/SeatAllocation");
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
    const memory = await startMemory();
    await mongoose.connect(memory.getUri());
    await ensureCatalog();
    await SeatingPlan.init();
    await SeatAllocation.init();

    const password = await bcrypt.hash("password123", 4);
    const superAdmin = await User.create({
        name: "Super Admin",
        email: "super-seat@example.com",
        password,
        role: "super_admin",
        status: "active"
    });
    const examCell = await User.create({
        name: "Exam Cell",
        email: "cell-seat@example.com",
        password,
        role: "examination_cell",
        status: "active"
    });
    const deptAdmin = await User.create({
        name: "Dept Admin",
        email: "dept-seat@example.com",
        password,
        role: "department_admin",
        status: "active"
    });
    const otherAdmin = await User.create({
        name: "Other Dept Admin",
        email: "other-seat@example.com",
        password,
        role: "department_admin",
        status: "active"
    });
    const faculty = await User.create({
        name: "Faculty",
        email: "faculty-seat@example.com",
        password,
        role: "faculty",
        status: "active"
    });
    const superToken = tokenFor(superAdmin);
    const cell = tokenFor(examCell);
    const facultyToken = tokenFor(faculty);

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
    await User.updateOne({ _id: deptAdmin._id }, { departmentRef: computing._id });
    await User.updateOne({ _id: otherAdmin._id }, { departmentRef: electrical._id });
    const dept = tokenFor(deptAdmin);
    const otherDept = tokenFor(otherAdmin);
    const program = (await must("program", "POST", "/api/programs", {
        name: "BSc Computing",
        code: "BSC",
        department: computing._id,
        duration: 4
    })).item;
    const batch = (await must("batch", "POST", "/api/batches", {
        name: "Comp 2026",
        academicYear: year._id,
        program: program._id,
        semester: 6
    })).item;
    const sectionA = (await must("section A", "POST", "/api/sections", {
        name: "A",
        batch: batch._id
    })).item;
    const sectionB = (await must("section B", "POST", "/api/sections", {
        name: "B",
        batch: batch._id
    })).item;
    const morning = (await must("morning", "POST", "/api/sessions", {
        name: "Seat Morning",
        code: "SEATMORN",
        reportingTime: "08:30",
        startTime: "09:00",
        endTime: "12:00"
    })).item;
    const types = await request("GET", "/api/exam-types", { token: superToken });
    const examType = types.data.items.find((item) => item.code === "END");
    const exam = (await must("exam", "POST", "/api/exams", {
        examinationSetup: true,
        title: "Seat Exams",
        examType: examType._id,
        academicYear: year._id,
        department: computing._id,
        program: program._id,
        semester: 6,
        startDate: "2026-11-01",
        endDate: "2026-11-30",
        reportingTime: "08:30",
        sessions: [morning._id],
        eligibleBatches: [batch._id],
        instructions: "Bring the admit card."
    })).exam;

    const makeStudents = async (prefix, rolls, section) => {
        const users = [];
        for (let index = 0; index < rolls.length; index += 1) {
            const user = await User.create({
                name: `${prefix} ${rolls[index]}`,
                email: `${prefix}-${rolls[index]}@example.com`.toLowerCase(),
                password,
                role: "student",
                status: "active",
                studentId: rolls[index],
                department: "Computing"
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

    const makeSubject = async (code, name) => {
        const created = await must(code, "POST", "/api/subjects", {
            code,
            name,
            subjectType: "theory",
            department: computing._id,
            program: program._id,
            semester: 6,
            duration: 120
        });
        const verified = await request("PATCH", `/api/subjects/${created.item._id}/verification`, {
            token: superToken,
            body: { verificationStatus: "verified" }
        });
        if (verified.status !== 200) throw new Error(`verify ${code}`);
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

    let day = 2;
    const nextDate = () => {
        const date = `2026-11-${String(day).padStart(2, "0")}`;
        day += 1;
        return date;
    };

    const makeSchedule = async (title, students, section = sectionA) => {
        const subject = await makeSubject(`S${String(day).padStart(2, "0")}${title}`.slice(0, 12), title);
        await register(subject, students);
        const created = await must(title, "POST", "/api/schedules", {
            examination: exam._id,
            subject: subject._id,
            date: nextDate(),
            session: morning._id,
            status: "draft"
        });
        return created.item;
    };

    const makeRoom = async (roomNumber, capacity, building = "Block", floor = "1") => {
        const created = await must(roomNumber, "POST", "/api/rooms", {
            roomNumber,
            building,
            floor,
            capacity,
            roomType: "classroom",
            department: computing._id
        });
        return created.item;
    };

    const allocate = async (schedule, room, count) => {
        await RoomAllocation.create({
            schedule: schedule._id,
            room: room._id,
            allocatedStudents: count,
            capacity: room.capacity,
            date: schedule.date,
            session: schedule.session._id || schedule.session,
            createdBy: superAdmin._id
        });
    };

    const seat = async (schedule, strategy, token = cell) => request("POST", "/api/seating-plans", {
        token,
        body: { schedule: schedule._id, strategy }
    });

    const tenStudents = await makeStudents("Ten", ["T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08", "T09", "T10"], sectionA);
    const scheduleTen = await makeSchedule("TenStudents", tenStudents);
    const roomTwenty = await makeRoom("R20", 20, "North", "1");
    await allocate(scheduleTen, roomTwenty, 20);
    const savedTen = await seat(scheduleTen, "ROLL_NUMBER");
    const tenSeats = savedTen.data?.rows || [];
    check(
        "CASE 1 one room, 10 students",
        savedTen.status === 201
            && savedTen.data.students === 10
            && savedTen.data.seatsAssigned === 10
            && savedTen.data.rooms.length === 1
            && savedTen.data.rooms[0].assigned === 10
            && tenSeats[0].seat === "A-01"
            && tenSeats[4].seat === "A-05"
            && tenSeats[5].seat === "B-01"
            && tenSeats[9].seat === "B-05",
        JSON.stringify({ status: savedTen.status, message: savedTen.data?.message, seats: tenSeats.map((row) => row.seat) })
    );

    const fullStudents = await makeStudents("Full", ["F01", "F02", "F03", "F04", "F05", "F06", "F07", "F08", "F09", "F10"], sectionA);
    const scheduleFull = await makeSchedule("FullRoom", fullStudents);
    const roomTen = await makeRoom("R10", 10, "North", "2");
    await allocate(scheduleFull, roomTen, 10);
    const savedFull = await seat(scheduleFull, "ROLL_NUMBER");
    check(
        "CASE 2 one room exactly full",
        savedFull.status === 201
            && savedFull.data.rooms.length === 1
            && savedFull.data.rooms[0].assigned === 10
            && savedFull.data.rooms[0].capacity === 10
            && savedFull.data.seatsAssigned === 10
            && new Set(savedFull.data.rows.map((row) => row.seat)).size === 10,
        JSON.stringify(savedFull.data?.rooms)
    );

    const multiStudents = await makeStudents("Multi", ["M01", "M02", "M03", "M04", "M05", "M06"], sectionA);
    const scheduleMulti = await makeSchedule("MultiRoom", multiStudents);
    const roomAlpha = await makeRoom("101", 10, "Alpha", "2");
    const roomBeta = await makeRoom("201", 10, "Beta", "1");
    await allocate(scheduleMulti, roomBeta, 3);
    await allocate(scheduleMulti, roomAlpha, 4);
    const savedMulti = await seat(scheduleMulti, "ROLL_NUMBER");
    const alphaRows = (savedMulti.data?.rows || []).filter((row) => row.room === "101");
    const betaRows = (savedMulti.data?.rows || []).filter((row) => row.room === "201");
    check(
        "CASE 3 multiple rooms are both used",
        savedMulti.status === 201 && savedMulti.data.rooms.length === 2 && alphaRows.length > 0 && betaRows.length > 0,
        JSON.stringify(savedMulti.data?.rooms)
    );
    check(
        "CASE 4 students follow room quotas instead of filling the first room",
        alphaRows.length === 4
            && betaRows.length === 2
            && savedMulti.data.rooms[0].roomNumber === "101"
            && savedMulti.data.rooms[0].assigned === 4
            && savedMulti.data.rooms[1].assigned === 2
            && savedMulti.data.seatsAssigned === 6,
        JSON.stringify(savedMulti.data?.rooms)
    );

    const rollStudents = await makeStudents("Roll", ["S10", "S2", "S1"], sectionA);
    const scheduleRoll = await makeSchedule("RollOrder", rollStudents);
    const roomRoll = await makeRoom("ROLL", 10, "North", "3");
    await allocate(scheduleRoll, roomRoll, 10);
    const savedRoll = await seat(scheduleRoll, "ROLL_NUMBER");
    check(
        "CASE 5 roll-number ordering is stable and ascending",
        (savedRoll.data?.rows || []).map((row) => row.rollNumber).join(",") === "S1,S2,S10",
        JSON.stringify(savedRoll.data?.rows)
    );

    const randomStudents = await makeStudents("Rand", ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"], sectionA);
    const scheduleRandom = await makeSchedule("Random", randomStudents);
    const roomRandom = await makeRoom("RAND", 20, "North", "4");
    await allocate(scheduleRandom, roomRandom, 20);
    const savedRandom = await seat(scheduleRandom, "RANDOM");
    const randomOrder = (savedRandom.data?.rows || []).map((row) => row.rollNumber).join(",");
    const regeneratedRandom = await request("POST", "/api/seating-plans/regenerate", {
        token: cell,
        body: { schedule: scheduleRandom._id, strategy: "RANDOM" }
    });
    const secondOrder = (regeneratedRandom.data?.rows || []).map((row) => row.rollNumber).join(",");
    check(
        "CASE 6 random strategy stores a permutation and can change on regenerate",
        savedRandom.status === 201
            && savedRandom.data.rows.length === 8
            && new Set(savedRandom.data.rows.map((row) => row.rollNumber)).size === 8
            && randomOrder !== "R1,R2,R3,R4,R5,R6,R7,R8"
            && regeneratedRandom.status === 201
            && secondOrder.split(",").sort().join(",") === "R1,R2,R3,R4,R5,R6,R7,R8",
        JSON.stringify({ randomOrder, secondOrder, status: regeneratedRandom.status })
    );

    const sectionStudents = [
        ...(await makeStudents("SecA", ["A2", "A1"], sectionA)),
        ...(await makeStudents("SecB", ["B1"], sectionB))
    ];
    const scheduleSection = await makeSchedule("Sections", sectionStudents);
    const roomSection = await makeRoom("SEC", 10, "North", "5");
    await allocate(scheduleSection, roomSection, 10);
    const savedSection = await seat(scheduleSection, "SECTION");
    check(
        "CASE 7 section grouping keeps roll order inside each section",
        (savedSection.data?.rows || []).map((row) => `${row.section}:${row.rollNumber}`).join(",") === "A:A1,A:A2,B:B1",
        JSON.stringify(savedSection.data?.rows)
    );

    const alternateStudents = await makeStudents("Alt", ["P1", "P2", "P3", "P4"], sectionA);
    const scheduleAlternate = await makeSchedule("Alternate", alternateStudents);
    const roomAlternate = await makeRoom("ALT", 10, "North", "6");
    await allocate(scheduleAlternate, roomAlternate, 10);
    const savedAlternate = await seat(scheduleAlternate, "ALTERNATE");
    check(
        "CASE 8 alternate interleaves the two halves of roll order",
        (savedAlternate.data?.rows || []).map((row) => row.rollNumber).join(",") === "P1,P3,P2,P4",
        JSON.stringify(savedAlternate.data?.rows)
    );

    const antiStudents = [
        ...(await makeStudents("AntiA", ["C1", "C2"], sectionA)),
        ...(await makeStudents("AntiB", ["D1", "D2"], sectionB))
    ];
    const scheduleAnti = await makeSchedule("AntiCopy", antiStudents);
    const roomAnti = await makeRoom("ANTI", 10, "North", "7");
    await allocate(scheduleAnti, roomAnti, 10);
    const savedAnti = await seat(scheduleAnti, "ANTI_COPY");
    const sameSectionStudents = await makeStudents("Same", ["E1", "E2", "E3", "E4"], sectionA);
    const scheduleSame = await makeSchedule("SameSection", sameSectionStudents);
    const roomSame = await makeRoom("SAME", 10, "North", "8");
    await allocate(scheduleSame, roomSame, 10);
    const savedSame = await seat(scheduleSame, "ANTI_COPY");
    check(
        "CASE 9 anti-copy alternates sections and still saves when separation is impossible",
        (savedAnti.data?.rows || []).map((row) => row.rollNumber).join(",") === "C1,D1,C2,D2"
            && (savedAnti.data.limitations || []).length === 0
            && savedSame.status === 201
            && savedSame.data.seatsAssigned === 4
            && (savedSame.data.limitations || []).some((item) => item.includes("same section")),
        JSON.stringify({ anti: savedAnti.data?.rows, limitations: savedSame.data?.limitations, status: savedSame.status })
    );

    const tightStudents = await makeStudents("Tight", ["Z1", "Z2", "Z3", "Z4", "Z5"], sectionA);
    const scheduleTight = await makeSchedule("TooSmall", tightStudents);
    const roomTight = await makeRoom("TINY", 3, "North", "9");
    await allocate(scheduleTight, roomTight, 3);
    const plansBefore = await SeatingPlan.countDocuments();
    const seatsBefore = await SeatAllocation.countDocuments();
    const rejected = await seat(scheduleTight, "ROLL_NUMBER");
    check(
        "CASE 10 insufficient capacity is rejected with no partial plan",
        rejected.status === 400
            && rejected.data.message === "Room capacity is insufficient for 5 students. Available seats: 3."
            && await SeatingPlan.countDocuments() === plansBefore
            && await SeatAllocation.countDocuments() === seatsBefore,
        JSON.stringify(rejected.data)
    );

    const emptyRoomStudents = await makeStudents("NoRoom", ["N1", "N2"], sectionA);
    const scheduleNoRoom = await makeSchedule("NoRooms", emptyRoomStudents);
    const noRooms = await request("POST", "/api/seating-plans/preview", {
        token: cell,
        body: { schedule: scheduleNoRoom._id, strategy: "ROLL_NUMBER" }
    });
    check(
        "CASE 11 no rooms",
        noRooms.status === 400 && noRooms.data.message === "No rooms are allocated for this schedule.",
        JSON.stringify(noRooms.data)
    );

    const scheduleNoStudents = await makeSchedule("NoStudents", []);
    const noStudents = await request("POST", "/api/seating-plans/preview", {
        token: cell,
        body: { schedule: scheduleNoStudents._id, strategy: "ROLL_NUMBER" }
    });
    check(
        "CASE 12 no students",
        noStudents.status === 400 && noStudents.data.message === "No eligible students found for this examination and subject.",
        JSON.stringify(noStudents.data)
    );

    const duplicateSource = await makeStudents("Dup", ["Q1"], sectionA);
    const scheduleDuplicate = await makeSchedule("DuplicateStudent", duplicateSource);
    await Schedule.updateOne(
        { _id: scheduleDuplicate._id },
        { eligibleStudents: [duplicateSource[0]._id, duplicateSource[0]._id] }
    );
    const duplicateRoom = await makeRoom("DUP", 5, "North", "10");
    await allocate(scheduleDuplicate, duplicateRoom, 5);
    const duplicateStudent = await request("POST", "/api/seating-plans/preview", {
        token: cell,
        body: { schedule: scheduleDuplicate._id, strategy: "ROLL_NUMBER" }
    });
    check(
        "CASE 13 duplicate student in the snapshot is rejected",
        duplicateStudent.status === 400 && duplicateStudent.data.message === "Duplicate student in the schedule snapshot.",
        JSON.stringify(duplicateStudent.data)
    );

    let duplicateSeatRejected = false;
    let duplicateStudentSeatRejected = false;
    try {
        await SeatAllocation.create({
            seatingPlan: savedTen.data.item._id,
            schedule: scheduleTen._id,
            student: fullStudents[0]._id,
            room: roomTwenty._id,
            seatNumber: "A-01",
            row: "A",
            column: 1,
            sequence: 99
        });
    } catch (error) {
        duplicateSeatRejected = error.code === 11000;
    }
    try {
        await SeatAllocation.create({
            seatingPlan: savedTen.data.item._id,
            schedule: scheduleTen._id,
            student: tenStudents[0]._id,
            room: roomTwenty._id,
            seatNumber: "Z-99",
            row: "Z",
            column: 1,
            sequence: 100
        });
    } catch (error) {
        duplicateStudentSeatRejected = error.code === 11000;
    }
    check(
        "CASE 14 duplicate seat and duplicate student seats are rejected",
        duplicateSeatRejected && duplicateStudentSeatRejected,
        JSON.stringify({ duplicateSeatRejected, duplicateStudentSeatRejected })
    );

    const again = await seat(scheduleTen, "ROLL_NUMBER");
    const regenerated = await request("POST", "/api/seating-plans/regenerate", {
        token: cell,
        body: { schedule: scheduleTen._id, strategy: "ROLL_NUMBER" }
    });
    const published = await SeatingPlan.find({ schedule: scheduleTen._id, status: "published" });
    const superseded = await SeatingPlan.find({ schedule: scheduleTen._id, status: "superseded" });
    const activeSeats = await SeatAllocation.find({ seatingPlan: published[0]?._id });
    const activeStudents = new Set(activeSeats.map((item) => String(item.student)));
    check(
        "CASE 15 regeneration keeps one published plan and does not duplicate active seats",
        again.status === 409
            && again.data.message === "Seating plan already exists."
            && regenerated.status === 201
            && regenerated.data.item.version === 2
            && published.length === 1
            && superseded.length === 1
            && activeSeats.length === 10
            && activeStudents.size === 10,
        JSON.stringify({ again: again.data, version: regenerated.data?.item, published: published.length, superseded: superseded.length })
    );

    const ownStudents = await makeStudents("Own", ["OA", "OB"], sectionA);
    ownStudents[0].name = "Alpha Student";
    ownStudents[1].name = "Beta Student";
    await ownStudents[0].save();
    await ownStudents[1].save();
    const scheduleOwn = await makeSchedule("OwnSeat", ownStudents);
    const roomOwnA = await makeRoom("OA1", 5, "Alpha", "1");
    const roomOwnB = await makeRoom("OB1", 5, "Beta", "1");
    await allocate(scheduleOwn, roomOwnA, 1);
    await allocate(scheduleOwn, roomOwnB, 1);
    await Schedule.updateOne({ _id: scheduleOwn._id }, { status: "scheduled" });
    const unpublished = await request("GET", `/api/seating-plans/student/me?schedule=${scheduleOwn._id}`, {
        token: tokenFor(ownStudents[0])
    });
    const savedOwn = await seat(scheduleOwn, "ROLL_NUMBER");
    const alphaSeat = await request("GET", `/api/seating-plans/student/me?schedule=${scheduleOwn._id}`, {
        token: tokenFor(ownStudents[0])
    });
    const betaSeat = await request("GET", `/api/seating-plans/student/me?schedule=${scheduleOwn._id}`, {
        token: tokenFor(ownStudents[1])
    });
    check(
        "CASE 16 student sees only their published room and seat",
        unpublished.status === 404
            && unpublished.data.message === "Seat allocation has not been published yet."
            && savedOwn.status === 201
            && alphaSeat.status === 200
            && alphaSeat.data.item.room === "OA1"
            && alphaSeat.data.item.building === "Alpha"
            && alphaSeat.data.item.seatNumber === "A-01"
            && alphaSeat.data.item.examination === "Seat Exams"
            && alphaSeat.data.item.subject
            && alphaSeat.data.item.session === "Seat Morning"
            && alphaSeat.data.item.reportingTime === "08:30"
            && alphaSeat.data.item.instructions === "Bring the admit card."
            && betaSeat.data.item.room === "OB1"
            && betaSeat.data.item.building === "Beta"
            && !JSON.stringify(alphaSeat.data).includes("Beta Student")
            && !JSON.stringify(betaSeat.data).includes("Alpha Student")
            && !JSON.stringify(alphaSeat.data).includes("OB1"),
        JSON.stringify({ unpublished: unpublished.data, alpha: alphaSeat.data, beta: betaSeat.data, saved: savedOwn.status })
    );

    const studentGenerate = await request("POST", "/api/seating-plans", {
        token: tokenFor(ownStudents[0]),
        body: { schedule: scheduleOwn._id, strategy: "ROLL_NUMBER" }
    });
    const facultyGenerate = await request("POST", "/api/seating-plans/preview", {
        token: facultyToken,
        body: { schedule: scheduleOwn._id, strategy: "ROLL_NUMBER" }
    });
    check(
        "CASE 17 student cannot generate seating",
        studentGenerate.status === 403 && facultyGenerate.status === 403,
        JSON.stringify({ student: studentGenerate.status, faculty: facultyGenerate.status })
    );

    const ownPreview = await request("POST", "/api/seating-plans/preview", {
        token: dept,
        body: { schedule: scheduleTen._id, strategy: "ROLL_NUMBER" }
    });
    const outsidePreview = await request("POST", "/api/seating-plans/preview", {
        token: otherDept,
        body: { schedule: scheduleTen._id, strategy: "ROLL_NUMBER" }
    });
    check(
        "CASE 18 department admin is scoped to their department",
        ownPreview.status === 200 && outsidePreview.status === 403 && outsidePreview.data.message === "This record is outside your department",
        JSON.stringify({ own: ownPreview.status, outside: outsidePreview.status, message: outsidePreview.data })
    );

    const allocationStudents = await makeStudents("Alloc", ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10"], sectionA);
    const scheduleAllocation = await makeSchedule("Allocation", allocationStudents);
    await makeRoom("ONLY", 30, "Only", "1");
    const allocationPreview = await request("POST", "/api/room-allocations/preview", {
        token: superToken,
        body: { schedule: scheduleAllocation._id }
    });
    const allocationSaved = await request("POST", "/api/room-allocations", {
        token: superToken,
        body: { schedule: scheduleAllocation._id }
    });
    const beforeAllocations = await RoomAllocation.find({ schedule: scheduleAllocation._id }).lean();
    const beforeSchedule = await Schedule.findById(scheduleAllocation._id).lean();
    const seatedAllocation = await seat(scheduleAllocation, "ROLL_NUMBER");
    const afterAllocations = await RoomAllocation.find({ schedule: scheduleAllocation._id }).lean();
    const afterSchedule = await Schedule.findById(scheduleAllocation._id).lean();
    check(
        "CASE 19 room allocation is unchanged by seating",
        allocationPreview.status === 200
            && allocationPreview.data.ok
            && allocationPreview.data.students === 10
            && allocationPreview.data.rooms.length === 1
            && allocationPreview.data.allocated === 10
            && allocationSaved.status === 201
            && seatedAllocation.status === 201
            && beforeAllocations.length === afterAllocations.length
            && beforeAllocations.every((row, index) => {
                return String(row.room) === String(afterAllocations[index].room)
                    && row.allocatedStudents === afterAllocations[index].allocatedStudents;
            })
            && String(beforeSchedule.room || "") === String(afterSchedule.room || ""),
        JSON.stringify({
            preview: allocationPreview.data,
            saved: allocationSaved.status,
            seating: seatedAllocation.status
        })
    );

    const phase1Students = await makeStudents("Phase", ["H1", "H2"], sectionA);
    const schedulePhase = await makeSchedule("PhaseOne", phase1Students);
    const phaseRoom = await makeRoom("PHASE", 10, "Phase", "1");
    await allocate(schedulePhase, phaseRoom, 10);
    const beforePhase = await Schedule.findById(schedulePhase._id).lean();
    const seatedPhase = await seat(schedulePhase, "SECTION");
    const afterPhase = await Schedule.findById(schedulePhase._id).lean();
    check(
        "CASE 20 schedule snapshot is unchanged by seating",
        seatedPhase.status === 201
            && String(beforePhase.examination) === String(afterPhase.examination)
            && String(beforePhase.subject) === String(afterPhase.subject)
            && new Date(beforePhase.date).toISOString() === new Date(afterPhase.date).toISOString()
            && beforePhase.status === afterPhase.status
            && beforePhase.eligibleStudents.map(String).join(",") === afterPhase.eligibleStudents.map(String).join(","),
        JSON.stringify({ seating: seatedPhase.status, status: afterPhase.status })
    );

    const failed = results.filter((item) => !item.ok);
    console.log(`PHASE2_SEATING_CHECKS ${results.length - failed.length}/${results.length}`);
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
