const PDFDocument = require("pdfkit");
const Schedule = require("../models/Schedule");
const User = require("../models/User");
const Exam = require("../models/Exam");
const ExamSession = require("../models/ExamSession");
const Subject = require("../models/Subject");
const ExamEligibility = require("../models/ExamEligibility");
const SeatAllocation = require("../models/SeatAllocation");
const { publishedPlan } = require("./seatingService");
const { isObjectId } = require("../utils/http");

const UNPUBLISHED = "Hall ticket is available after the examination schedule is published.";
const NO_PLAN = "Hall ticket is not available because seat allocation has not been published yet.";
const NO_SEAT = "Your seat has not been assigned yet.";
const CANCELLED = "Hall ticket is unavailable for this cancelled examination.";
const DENIED = "Access denied.";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fail = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const sanitizeToken = (value) => String(value || "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_.-]+|[_.-]+$/g, "")
    .slice(0, 40);

const hallTicketFilename = (studentId, subjectCode) => {
    const student = sanitizeToken(studentId);
    const subject = sanitizeToken(subjectCode);
    const parts = ["Hall_Ticket", student, subject].filter(Boolean);
    if (parts.length < 2) return "Hall_Ticket_ExamPortal.pdf";
    return `${parts.join("_")}.pdf`;
};

const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${day} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

const display = (value) => {
    const text = String(value ?? "").trim();
    return text || "Not recorded";
};

const studentRetainsEligibility = async (schedule, studentId) => {
    const listed = (schedule.eligibleStudents || []).some(
        (id) => String(id) === String(studentId)
    );
    if (!listed) return false;

    const row = await ExamEligibility.findOne({
        student: studentId,
        examination: schedule.examination,
        subject: schedule.subject,
        eligibilityStatus: { $in: ["eligible", "registered"] }
    }).select("_id");

    return Boolean(row);
};

const renderHallTicket = (ticket) => new Promise((resolve, reject) => {
    const doc = new PDFDocument({
        size: "A4",
        margin: 56,
        compress: false,
        info: {
            Title: "Hall Ticket",
            Author: "ExamPortal"
        }
    });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const contentWidth = () => doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const running = `EXAMPORTAL Hall Ticket | ${display(ticket.studentId)} | ${display(ticket.subjectCode)}`;

    doc.on("pageAdded", () => {
        const top = doc.page.margins.top;
        doc.font("Helvetica").fontSize(9).fillColor("#4b5563");
        doc.text(running, doc.page.margins.left, 28, {
            width: contentWidth(),
            lineBreak: false,
            height: 14,
            ellipsis: true
        });
        doc.x = doc.page.margins.left;
        doc.y = top;
    });

    const ensure = (height) => {
        const limit = doc.page.height - doc.page.margins.bottom;
        if (doc.y + height > limit) doc.addPage();
    };

    const rule = () => {
        const y = doc.y + 2;
        doc.moveTo(doc.page.margins.left, y)
            .lineTo(doc.page.width - doc.page.margins.right, y)
            .strokeColor("#d6d3e8")
            .lineWidth(1)
            .stroke();
        doc.y = y + 12;
    };

    const section = (title) => {
        ensure(40);
        doc.moveDown(0.45);
        doc.font("Helvetica-Bold").fontSize(12).fillColor("#1e3a5f")
            .text(title, doc.page.margins.left, doc.y, { width: contentWidth() });
        const y = doc.y + 2;
        doc.moveTo(doc.page.margins.left, y)
            .lineTo(doc.page.width - doc.page.margins.right, y)
            .strokeColor("#e5e7eb")
            .lineWidth(0.8)
            .stroke();
        doc.y = y + 10;
    };

    const row = (label, value) => {
        const text = display(value);
        const labelWidth = 150;
        const valueWidth = contentWidth() - labelWidth - 12;
        doc.font("Helvetica").fontSize(11);
        const height = Math.max(16, doc.heightOfString(text, { width: valueWidth }));
        ensure(height + 4);
        const y = doc.y;
        const x = doc.page.margins.left;
        doc.font("Helvetica").fontSize(11).fillColor("#4b5563")
            .text(label, x, y, { width: labelWidth, lineBreak: false });
        doc.font("Helvetica").fontSize(11).fillColor("#111827")
            .text(text, x + labelWidth + 12, y, { width: valueWidth });
        doc.x = x;
        doc.y = y + height + 4;
    };

    doc.font("Helvetica-Bold").fontSize(16).fillColor("#1e3a5f")
        .text("EXAMPORTAL", doc.page.margins.left, doc.y, { width: contentWidth(), align: "center" });
    doc.moveDown(0.15);
    doc.font("Helvetica").fontSize(10).fillColor("#4b5563")
        .text("Examination Management Portal", { width: contentWidth(), align: "center" });
    doc.moveDown(0.45);
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#111827")
        .text("HALL TICKET", { width: contentWidth(), align: "center" });
    rule();

    section("Student Details");
    row("Name", ticket.name);
    row("Student ID", ticket.studentId);
    row("Department", ticket.department);
    row("Program", ticket.program);
    row("Semester", ticket.semester);
    row("Academic Year", ticket.academicYear);

    section("Examination Details");
    row("Examination", ticket.examination);
    row("Subject", ticket.subject);
    row("Subject Code", ticket.subjectCode);
    row("Date", ticket.date);
    row("Session", ticket.session);
    row("Reporting Time", ticket.reportingTime);
    row("Exam Time", ticket.examTime);
    if (ticket.duration) row("Duration", `${ticket.duration} minutes`);

    section("Examination Venue");
    row("Building", ticket.building);
    row("Room", ticket.room);
    row("Seat Number", ticket.seatNumber);

    section("Instructions");
    const instructions = display(ticket.instructions) === "Not recorded"
        ? "No additional instructions have been published."
        : String(ticket.instructions);
    doc.font("Helvetica").fontSize(11).fillColor("#111827").lineGap(3);
    doc.text(instructions, doc.page.margins.left, doc.y, { width: contentWidth() });
    doc.lineGap(0);

    section("Candidate Declaration / Notice");
    doc.font("Helvetica").fontSize(11).fillColor("#111827");
    doc.text(
        "Candidate must verify the examination date, time, room and seat before reporting to the examination venue.",
        doc.page.margins.left,
        doc.y,
        { width: contentWidth() }
    );

    ensure(48);
    doc.moveDown(1);
    rule();
    doc.font("Helvetica").fontSize(9).fillColor("#4b5563");
    doc.text("Generated for authenticated student", { width: contentWidth() });
    doc.text(`Generated: ${ticket.generatedAt}`, { width: contentWidth() });

    doc.end();
});

const createHallTicket = async ({ userId, scheduleId }) => {
    if (!isObjectId(scheduleId)) throw fail(400, "Invalid schedule id");

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) throw fail(404, "Schedule not found");

    const eligible = await studentRetainsEligibility(schedule, userId);
    if (!eligible) throw fail(403, DENIED);

    if (schedule.status !== "scheduled") throw fail(409, UNPUBLISHED);
    if (schedule.operationalState === "cancelled") throw fail(409, CANCELLED);

    const plan = await publishedPlan(schedule._id);
    if (!plan) throw fail(404, NO_PLAN);

    const seat = await SeatAllocation.findOne({
        seatingPlan: plan._id,
        schedule: schedule._id,
        student: userId
    });
    if (!seat) throw fail(404, NO_SEAT);

    const [user, exam, session, subject] = await Promise.all([
        User.findById(userId)
            .select("name studentId department program semester academicYear departmentRef")
            .populate("departmentRef", "name"),
        Exam.findById(schedule.examination).select("title instructions"),
        ExamSession.findById(schedule.session).select("name startTime endTime"),
        Subject.findById(schedule.subject).select("name code")
    ]);

    if (!user) throw fail(401, "Authentication required");

    await seat.populate("room", "roomNumber building floor");

    const examTime = session?.startTime && session?.endTime
        ? `${session.startTime} - ${session.endTime}`
        : "";
    const generatedAt = `${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`;
    const ticket = {
        name: user.name,
        studentId: user.studentId || "",
        department: user.department || user.departmentRef?.name || "",
        program: user.program || "",
        semester: user.semester ? String(user.semester) : "",
        academicYear: user.academicYear || "",
        examination: exam?.title || "",
        subject: subject?.name || "",
        subjectCode: subject?.code || "",
        date: formatDate(schedule.date),
        session: session?.name || "",
        reportingTime: schedule.reportingTime || "",
        examTime,
        duration: schedule.duration || "",
        building: seat.room?.building || "",
        room: seat.room?.roomNumber || "",
        seatNumber: seat.seatNumber || "",
        instructions: exam?.instructions || "",
        generatedAt
    };

    const pdf = await renderHallTicket(ticket);
    return {
        pdf,
        filename: hallTicketFilename(ticket.studentId, ticket.subjectCode)
    };
};

module.exports = {
    createHallTicket,
    hallTicketFilename,
    UNPUBLISHED,
    NO_PLAN,
    NO_SEAT,
    CANCELLED,
    DENIED
};
