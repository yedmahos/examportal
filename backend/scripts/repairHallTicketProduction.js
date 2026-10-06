/**
 * Production hall ticket data repair for one existing student and schedule.
 *
 * Default is read-only. Writes happen only when both are set:
 *   ALLOW_PRODUCTION_HALL_TICKET_REPAIR=1
 *   DRY_RUN=0
 *
 * Connects only to MONGODB_URI. Refuses localhost and non-Render/Atlas hosts.
 * Does not print the URI, credentials, passwords, or tokens.
 */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Exam = require("../models/Exam");
const Subject = require("../models/Subject");
const Schedule = require("../models/Schedule");
const ExamEligibility = require("../models/ExamEligibility");
const ScheduleVersion = require("../models/ScheduleVersion");
const SeatingPlan = require("../models/SeatingPlan");
const SeatAllocation = require("../models/SeatAllocation");
const Notification = require("../models/Notification");
const ExamSession = require("../models/ExamSession");
const Room = require("../models/Room");
const { saveSeating } = require("../services/seatingService");
const { notifySeatingPublished } = require("../services/notificationEvents");
const { createHallTicket } = require("../services/hallTicketService");

const STUDENT_ID = "6aaa1fef9e73561d8ee64326";
const STUDENT_EMAIL = "24155961@kiit.ac.in";
const STUDENT_ROLL = "24155961";
const SCHEDULE_ID = "6ac360bace3926c15327c5d6";
const EXAM_ID = "6ac36067ce3926c15327c5d3";
const SUBJECT_ID = "6ac35fe5ce3926c15327c5d0";
const SUBJECT_CODE = "MAN1102";
const EXPECTED_DATE = "2026-10-08";

const dryRun = process.env.DRY_RUN !== "0";
const writesAllowed = process.env.ALLOW_PRODUCTION_HALL_TICKET_REPAIR === "1" && !dryRun;

const redact = (value) => String(value || "")
    .replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "mongodb://[redacted]");

const idOf = (value) => {
    if (!value) return "";
    if (value._id) return String(value._id);
    return String(value);
};

const utcDay = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
};

const formatDate = (value) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${day} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

const describeUri = (uri) => {
    const match = String(uri).match(/^mongodb(\+srv)?:\/\/([^/?]+)(\/[^?]*)?/i);
    if (!match) return null;
    const authority = match[2];
    const at = authority.lastIndexOf("@");
    const host = at >= 0 ? authority.slice(at + 1) : authority;
    const database = (match[3] || "").replace(/^\//, "");
    return {
        scheme: match[1] ? "mongodb+srv" : "mongodb",
        host,
        database: database || "(none)"
    };
};

const assertProductionTarget = (info) => {
    if (!info || !info.host) {
        throw new Error("MONGODB_URI could not be classified. Refusing to connect.");
    }

    const host = info.host.toLowerCase();
    const local = host === "localhost"
        || host.startsWith("127.")
        || host.startsWith("0.0.0.0")
        || host.endsWith(".local")
        || host.includes("memory");

    if (local) {
        throw new Error(`Refusing local database host ${info.host}.`);
    }

    const productionHost = host.endsWith(".mongodb.net")
        || host.includes("render.com")
        || host.includes(".mongo.render");

    if (!productionHost) {
        throw new Error(`Refusing host ${info.host}. It is not a Render or Atlas production host.`);
    }
};

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
    return parts.join("");
};

const stop = (message) => {
    const error = new Error(message);
    error.repairStop = true;
    return error;
};

const subjectNameAccepted = (name) => {
    const value = String(name || "").trim().toLowerCase();
    return value === "bda" || value.includes("big data");
};

const sameId = (left, right) => idOf(left) === idOf(right);

const scheduleFingerprint = (schedule, session, room) => ({
    examination: idOf(schedule.examination),
    subject: idOf(schedule.subject),
    date: utcDay(schedule.date),
    session: idOf(schedule.session),
    sessionName: session?.name || "",
    startTime: session?.startTime || "",
    endTime: session?.endTime || "",
    reportingTime: schedule.reportingTime || "",
    duration: schedule.duration,
    roomId: room ? idOf(room) : "",
    roomNumber: room?.roomNumber || "",
    building: room?.building || "",
    status: schedule.status,
    workflowLocked: Boolean(schedule.workflowLocked),
    publishedVersion: schedule.publishedVersion ?? null,
    operationalState: schedule.operationalState || ""
});

const loadContext = async () => {
    const student = await User.findOne({ email: STUDENT_EMAIL })
        .select("name email studentId department program semester academicYear departmentRef status role");
    const exam = await Exam.findById(EXAM_ID).select("title instructions semester status");
    const subject = await Subject.findById(SUBJECT_ID).select("name code");
    const schedule = await Schedule.findById(SCHEDULE_ID);
    const session = schedule
        ? await ExamSession.findById(schedule.session).select("name startTime endTime reportingTime")
        : null;
    const room = schedule?.room
        ? await Room.findById(schedule.room).select("roomNumber building floor capacity")
        : null;
    const eligibility = await ExamEligibility.findOne({
        student: STUDENT_ID,
        examination: EXAM_ID,
        subject: SUBJECT_ID
    }).select("student examination subject eligibilityStatus examRegistrationStatus academicStatus");
    const versions = await ScheduleVersion.find({ schedule: SCHEDULE_ID })
        .sort({ versionNumber: 1 })
        .select("versionNumber state publishedAt snapshot.date snapshot.reportingTime snapshot.room snapshot.session snapshot.eligibleStudentIds snapshot.operationalChange")
        .lean();
    const plans = await SeatingPlan.find({ schedule: SCHEDULE_ID })
        .sort({ version: 1 })
        .select("version status strategy studentCount generatedAt generatedBy")
        .lean();
    const published = plans.find((plan) => plan.status === "published") || null;
    const studentSeats = await SeatAllocation.find({
        schedule: SCHEDULE_ID,
        student: STUDENT_ID
    }).select("seatingPlan room seatNumber").lean();
    const publishedSeat = published
        ? studentSeats.find((seat) => sameId(seat.seatingPlan, published._id)) || null
        : null;
    const notifications = await Notification.find({
        recipient: STUDENT_ID,
        referenceId: SCHEDULE_ID
    }).select("title type referenceId eventKey createdAt").lean();
    const actors = await User.find({ role: "examination_cell", status: "active" })
        .select("name email role status")
        .sort({ createdAt: 1 });

    return {
        student,
        exam,
        subject,
        schedule,
        session,
        room,
        eligibility,
        versions,
        plans,
        published,
        studentSeats,
        publishedSeat,
        notifications,
        actors
    };
};

const verifyContext = (context) => {
    const { student, exam, subject, schedule, session, room, eligibility } = context;

    if (!student || !sameId(student, STUDENT_ID)) {
        throw stop("Student email and _id do not match the target record.");
    }
    if (student.studentId !== STUDENT_ROLL || student.status !== "active" || student.role !== "student") {
        throw stop("Student roll number, role, or status does not match the target record.");
    }
    if (!exam || exam.title !== "MID") {
        throw stop("Examination id or title does not match MID.");
    }
    if (!subject || subject.code !== SUBJECT_CODE || !subjectNameAccepted(subject.name)) {
        throw stop("Subject id, code, or name does not match BDA / MAN1102.");
    }
    if (!schedule) throw stop("Schedule was not found.");
    if (!sameId(schedule.examination, EXAM_ID) || !sameId(schedule.subject, SUBJECT_ID)) {
        throw stop("Schedule does not point at the target examination and subject.");
    }
    if (schedule.operationalState === "cancelled") {
        throw stop("Schedule operationalState is cancelled.");
    }
    if (schedule.status !== "scheduled") {
        throw stop("Schedule is not scheduled under the current hall ticket rules.");
    }
    if (utcDay(schedule.date) !== EXPECTED_DATE) throw stop("Schedule date does not match 08 Oct 2026.");
    if (!session || session.name !== "Morning" || session.startTime !== "09:00" || session.endTime !== "12:00") {
        throw stop("Schedule session or exam times do not match Morning 09:00-12:00.");
    }
    if (schedule.reportingTime !== "08:30") throw stop("Schedule reporting time does not match 08:30.");
    if (!room || room.roomNumber !== "C-001" || room.building !== "C-25") {
        throw stop("Schedule room does not match C-001 / C-25.");
    }
    if (!eligibility) throw stop("ExamEligibility for this student, examination, and subject is missing.");
    if (eligibility.eligibilityStatus === "blocked") throw stop("ExamEligibility is blocked. It was not changed.");
    if (!["eligible", "registered"].includes(eligibility.eligibilityStatus)) {
        throw stop(`ExamEligibility status ${eligibility.eligibilityStatus} is not valid for a hall ticket.`);
    }
};

const printAudit = (context) => {
    const { student, schedule, session, room, eligibility, versions, plans, publishedSeat, notifications } = context;
    const eligibleIds = (schedule.eligibleStudents || []).map(idOf);
    const scheduleNote = notifications.find((item) => item.title === "Examination Schedule Published");
    const seatNote = notifications.find((item) => item.title === "Seat Allocation Published");
    const publishedVersions = versions.filter((version) => version.state === "published");

    console.log("STUDENT");
    console.log(`name ${student.name}`);
    console.log(`studentId ${student.studentId}`);
    console.log(`department ${student.department || ""}`);
    console.log(`program ${student.program || ""}`);
    console.log(`semester ${student.semester ?? ""}`);
    console.log(`academicYear ${student.academicYear || ""}`);
    console.log(`status ${student.status}`);
    console.log(`_id ${idOf(student)}`);

    console.log("SCHEDULE");
    console.log(`_id ${idOf(schedule)}`);
    console.log(`status ${schedule.status}`);
    console.log(`workflowLocked ${Boolean(schedule.workflowLocked)}`);
    console.log(`publishedVersion ${schedule.publishedVersion ?? ""}`);
    console.log(`operationalState ${schedule.operationalState || ""}`);
    console.log(`date ${utcDay(schedule.date)}`);
    console.log(`session ${session.name} ${session.startTime}-${session.endTime}`);
    console.log(`reportingTime ${schedule.reportingTime}`);
    console.log(`room ${room.building} ${room.roomNumber}`);
    console.log(`eligibleStudents ${eligibleIds.length} ${eligibleIds.join(",")}`);

    console.log("ELIGIBILITY");
    console.log(`${eligibility.eligibilityStatus}`);

    console.log("VERSIONS");
    if (!versions.length) console.log("none");
    versions.forEach((version) => {
        const snapshot = version.snapshot || {};
        const snapshotRoom = snapshot.room
            ? `${snapshot.room.building || ""} ${snapshot.room.roomNumber || snapshot.room.id || ""}`.trim()
            : "";
        const snapshotSession = snapshot.session?.name || snapshot.session || "";
        const snapshotStudents = Array.isArray(snapshot.eligibleStudentIds) ? snapshot.eligibleStudentIds.length : 0;
        console.log(`v${version.versionNumber} ${version.state} date=${snapshot.date ? utcDay(snapshot.date) : ""} session=${snapshotSession} room=${snapshotRoom} eligibleStudents=${snapshotStudents}`);
    });
    console.log(`latestPublished ${publishedVersions.length ? publishedVersions[publishedVersions.length - 1].versionNumber : "none"}`);

    console.log("SEATING");
    if (!plans.length) console.log("none");
    plans.forEach((plan) => {
        console.log(`v${plan.version} ${plan.status} students=${plan.studentCount} generatedAt=${plan.generatedAt ? new Date(plan.generatedAt).toISOString() : ""}`);
    });
    console.log(`studentPublishedSeat ${publishedSeat ? publishedSeat.seatNumber : "MISSING"}`);

    console.log("NOTIFICATIONS");
    if (!notifications.length) console.log("none");
    notifications.forEach((item) => {
        console.log(`${item.title} type=${item.type} referenceId=${idOf(item.referenceId)}`);
    });
    console.log(`scheduleNotification ${scheduleNote ? "PRESENT" : "MISSING"}`);
    console.log(`seatNotification ${seatNote ? "PRESENT" : "MISSING"}`);
};

const proposalFor = (context) => {
    const eligibleIds = (context.schedule.eligibleStudents || []).map(idOf);
    const studentListed = eligibleIds.includes(STUDENT_ID);
    const changes = [];

    if (!studentListed) {
        changes.push(`Schedule.eligibleStudents add ${STUDENT_ID} with $addToSet`);
    }
    if (!context.published) {
        changes.push("Create one published SeatingPlan via seatingService.saveSeating strategy ROLL_NUMBER");
        changes.push("Create SeatAllocation rows for the schedule's eligible students through that service");
        changes.push("Let notifySeatingPublished create Seat Allocation Published when a seat is new");
    } else if (!context.publishedSeat) {
        changes.push("STOP: a published seating plan exists and this student has no seat. No regeneration.");
    }

    return {
        studentListed,
        eligibility: "VALID",
        seatingPlan: context.published ? "PRESENT" : "MISSING",
        seat: context.publishedSeat ? "PRESENT" : "MISSING",
        scheduleNotification: context.notifications.some((item) => item.title === "Examination Schedule Published")
            ? "PRESENT"
            : "MISSING",
        seatNotification: context.notifications.some((item) => item.title === "Seat Allocation Published")
            ? "PRESENT"
            : "MISSING",
        changes
    };
};

const printDryRun = (context, proposal) => {
    const { student, session, room } = context;
    console.log("HALL TICKET PRODUCTION REPAIR - DRY RUN");
    console.log("Student:");
    console.log(student.name);
    console.log(student.studentId);
    console.log("Schedule:");
    console.log("MID / BDA / MAN1102");
    console.log(formatDate(context.schedule.date));
    console.log(session.name);
    console.log(`${session.startTime} - ${session.endTime}`);
    console.log(`Reporting ${context.schedule.reportingTime}`);
    console.log(`${room.roomNumber} / ${room.building}`);
    console.log(`Eligibility: ${proposal.eligibility}`);
    console.log(`Schedule eligibleStudents: ${proposal.studentListed ? "PRESENT" : "MISSING"}`);
    console.log(`Published seating plan: ${proposal.seatingPlan}`);
    console.log(`Student SeatAllocation: ${proposal.seat}`);
    console.log(`Schedule notification: ${proposal.scheduleNotification}`);
    console.log(`Seat notification: ${proposal.seatNotification}`);
    console.log("Proposed changes:");
    if (!proposal.changes.length) console.log("none");
    proposal.changes.forEach((change) => console.log(change));
    console.log("DO NOT WRITE ANYTHING IN DRY-RUN MODE.");
};

const backupState = async (context) => {
    const payload = {
        createdAt: new Date().toISOString(),
        student: {
            _id: idOf(context.student),
            name: context.student.name,
            email: context.student.email,
            studentId: context.student.studentId,
            department: context.student.department || "",
            program: context.student.program || "",
            semester: context.student.semester ?? null,
            academicYear: context.student.academicYear || "",
            departmentRef: idOf(context.student.departmentRef),
            status: context.student.status,
            role: context.student.role
        },
        exam: {
            _id: idOf(context.exam),
            title: context.exam.title,
            instructions: context.exam.instructions || ""
        },
        subject: {
            _id: idOf(context.subject),
            name: context.subject.name,
            code: context.subject.code
        },
        schedule: scheduleFingerprint(context.schedule, context.session, context.room),
        eligibleStudents: (context.schedule.eligibleStudents || []).map(idOf),
        eligibility: {
            _id: idOf(context.eligibility),
            eligibilityStatus: context.eligibility.eligibilityStatus
        },
        versions: context.versions.map((version) => ({
            versionNumber: version.versionNumber,
            state: version.state,
            snapshot: version.snapshot || null
        })),
        plans: context.plans,
        seats: context.studentSeats,
        notifications: context.notifications
    };
    const file = `/tmp/examportal-hall-ticket-repair-${Date.now()}.json`;
    fs.writeFileSync(file, JSON.stringify(payload, null, 2));
    return file;
};

const transactionsSupported = async () => {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    return Boolean(hello.setName || hello.msg === "isdbgrid");
};

const addStudentToSchedule = async () => {
    const update = {
        $addToSet: { eligibleStudents: new mongoose.Types.ObjectId(STUDENT_ID) }
    };
    const filter = { _id: SCHEDULE_ID };

    if (await transactionsSupported()) {
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                await Schedule.updateOne(filter, update, { session });
            });
        } finally {
            await session.endSession();
        }
        return "transaction";
    }

    await Schedule.updateOne(filter, update);
    return "single-document";
};

const assertScheduleUnchanged = (before, after) => {
    const ignored = new Set(["eligibleStudents"]);
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
        if (ignored.has(key)) continue;
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
            throw stop(`Schedule field ${key} changed during the eligible-student repair.`);
        }
    }
};

const verifyPdf = async (context) => {
    const { pdf } = await createHallTicket({
        userId: STUDENT_ID,
        scheduleId: SCHEDULE_ID
    });

    if (!Buffer.isBuffer(pdf) || !pdf.subarray(0, 4).equals(Buffer.from("%PDF"))) {
        throw stop("Hall ticket response is not a PDF.");
    }

    const text = pdfPlain(pdf);
    const seat = context.publishedSeat;
    const room = await Room.findById(seat.room).select("roomNumber building");
    const expectedInstructions = String(context.exam.instructions || "").trim()
        ? String(context.exam.instructions)
        : "No additional instructions have been published.";
    const expected = [
        context.student.name,
        context.student.studentId,
        context.student.department,
        context.student.program,
        String(context.student.semester),
        context.student.academicYear,
        context.exam.title,
        context.subject.name,
        context.subject.code,
        formatDate(context.schedule.date),
        context.session.name,
        context.schedule.reportingTime,
        context.session.startTime,
        context.session.endTime,
        room?.building,
        room?.roomNumber,
        seat.seatNumber,
        expectedInstructions
    ];
    const missing = expected.filter((value) => value && !text.includes(String(value)));

    return {
        bytes: pdf.length,
        seat: seat.seatNumber,
        room: room ? `${room.building} ${room.roomNumber}` : "",
        missing
    };
};

const repair = async (context) => {
    const otherPublishedSeats = context.published
        ? await SeatAllocation.countDocuments({ seatingPlan: context.published._id, student: { $ne: STUDENT_ID } })
        : 0;

    if (context.published && !context.publishedSeat) {
        throw stop("A published seating plan exists without this student's seat. Regeneration was not run.");
    }

    if (context.published && context.publishedSeat && (context.schedule.eligibleStudents || []).map(idOf).includes(STUDENT_ID)) {
        console.log("HALL TICKET ALREADY AVAILABLE");
        console.log("NO REPAIR REQUIRED");
        return context;
    }

    if (!context.actors.length) {
        throw stop("No active examination_cell user exists. No seating actor was created.");
    }

    if (otherPublishedSeats > 0 && !context.publishedSeat) {
        throw stop("Published seating already assigns other students. Their seats were left unchanged.");
    }

    const backup = await backupState(context);
    console.log(`backup ${path.basename(backup)}`);

    const before = scheduleFingerprint(context.schedule, context.session, context.room);
    const beforeEligible = (context.schedule.eligibleStudents || []).map(idOf);
    let mode = "unchanged";

    if (!beforeEligible.includes(STUDENT_ID)) {
        mode = await addStudentToSchedule();
        console.log(`eligibleStudents update ${mode}`);
    }

    const schedule = await Schedule.findById(SCHEDULE_ID);
    const session = await ExamSession.findById(schedule.session).select("name startTime endTime reportingTime");
    const room = await Room.findById(schedule.room).select("roomNumber building floor capacity");
    const after = scheduleFingerprint(schedule, session, room);
    assertScheduleUnchanged(
        { ...before, eligibleStudents: beforeEligible },
        { ...after, eligibleStudents: (schedule.eligibleStudents || []).map(idOf) }
    );

    const eligibleNow = (schedule.eligibleStudents || []).map(idOf);
    if (!eligibleNow.includes(STUDENT_ID)) throw stop("Target student is still missing from eligibleStudents.");
    const preserved = beforeEligible.every((id) => eligibleNow.includes(id));
    if (!preserved) throw stop("An existing eligible student was removed.");
    if (new Set(eligibleNow).size !== eligibleNow.length) throw stop("eligibleStudents contains a duplicate.");

    let published = await SeatingPlan.findOne({ schedule: SCHEDULE_ID, status: "published" });
    if (!published) {
        if ((await SeatingPlan.countDocuments({ schedule: SCHEDULE_ID, status: "published" })) > 0) {
            throw stop("Published seating appeared during the repair. No second plan was created.");
        }
        const actor = context.actors[0];
        console.log(`seating actor ${idOf(actor)} ${actor.email}`);
        await saveSeating(schedule, "ROLL_NUMBER", actor._id, false);
        published = await SeatingPlan.findOne({ schedule: SCHEDULE_ID, status: "published" });
    }

    const publishedCount = await SeatingPlan.countDocuments({ schedule: SCHEDULE_ID, status: "published" });
    if (publishedCount !== 1 || !published) throw stop("Expected exactly one published seating plan.");

    const seat = await SeatAllocation.findOne({
        seatingPlan: published._id,
        schedule: SCHEDULE_ID,
        student: STUDENT_ID
    });
    if (!seat) throw stop("SeatAllocation for the target student was not created.");

    const seatRoom = await Room.findById(seat.room).select("roomNumber building");
    if (seatRoom?.roomNumber !== "C-001" || seatRoom?.building !== "C-25") {
        throw stop("Generated seat is not in C-001 / C-25. No further writes.");
    }

    const seatCount = await SeatAllocation.countDocuments({
        seatingPlan: published._id,
        student: STUDENT_ID
    });
    if (seatCount !== 1) throw stop("Target student has more than one seat on the published plan.");

    let seatNote = await Notification.findOne({
        recipient: STUDENT_ID,
        referenceId: SCHEDULE_ID,
        title: "Seat Allocation Published",
        type: "exam"
    });

    if (!seatNote) {
        await notifySeatingPublished({
            schedule,
            assignments: [{
                student: STUDENT_ID,
                room: seat.room,
                roomNumber: seatRoom.roomNumber,
                building: seatRoom.building,
                seatNumber: seat.seatNumber
            }],
            previousSeats: []
        });
        seatNote = await Notification.findOne({
            recipient: STUDENT_ID,
            referenceId: SCHEDULE_ID,
            title: "Seat Allocation Published",
            type: "exam"
        });
    }

    if (!seatNote) throw stop("Seat Allocation Published notification was not created.");

    const noteCount = await Notification.countDocuments({
        recipient: STUDENT_ID,
        referenceId: SCHEDULE_ID,
        title: "Seat Allocation Published"
    });
    if (noteCount !== 1) throw stop("More than one Seat Allocation Published notification exists.");

    return loadContext();
};

const run = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw stop("MONGODB_URI is not set. No database was contacted and no data was written.");
    }

    const info = describeUri(uri);
    assertProductionTarget(info);
    console.log(`database ${info.scheme} host=${info.host} db=${info.database}`);
    console.log(`mode ${writesAllowed ? "WRITE" : "READ ONLY"}`);

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    const context = await loadContext();
    verifyContext(context);
    printAudit(context);
    const proposal = proposalFor(context);

    if (!writesAllowed) {
        printDryRun(context, proposal);
        if (!proposal.changes.length && context.publishedSeat) {
            const pdf = await verifyPdf(context);
            console.log(`pdf bytes=${pdf.bytes} seat=${pdf.seat} missing=${pdf.missing.join("|") || "none"}`);
            console.log("HALL TICKET ALREADY AVAILABLE");
            console.log("NO REPAIR REQUIRED");
        }
        return;
    }

    console.log("HALL TICKET PRODUCTION REPAIR - WRITE");
    const after = await repair(context);
    const pdf = await verifyPdf(after);
    console.log(`pdf bytes=${pdf.bytes} seat=${pdf.seat} room=${pdf.room} missing=${pdf.missing.join("|") || "none"}`);
    if (pdf.missing.length) throw stop("Hall ticket PDF does not contain the current record values.");

    const studentAfter = await User.findById(STUDENT_ID).select("email studentId status name");
    if (studentAfter.email !== STUDENT_EMAIL || studentAfter.studentId !== STUDENT_ROLL) {
        throw stop("Student identity changed.");
    }
    const examAfter = await Exam.findById(EXAM_ID).select("title");
    if (examAfter.title !== "MID") throw stop("Examination changed.");
    const subjectAfter = await Subject.findById(SUBJECT_ID).select("code name");
    if (subjectAfter.code !== SUBJECT_CODE) throw stop("Subject changed.");

    console.log("PRODUCTION DATA REPAIR VERIFIED");
    console.log(`studentSeat ${pdf.seat}`);
};

run()
    .catch((error) => {
        console.error(redact(error.message));
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState) await mongoose.disconnect().catch(() => {});
    });
