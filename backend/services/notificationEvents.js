const Notification = require("../models/Notification");
const Exam = require("../models/Exam");
const Schedule = require("../models/Schedule");

let indexesReady = null;

const ensureIndexes = () => {
    if (!indexesReady) {
        indexesReady = Notification.init();
    }

    return indexesReady;
};

const idOf = (value) => {
    if (!value) return "";
    return String(value._id || value);
};

const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC"
    });
};

const paperLabel = (examination, subject) => {
    const examName = examination?.title || "";
    const subjectName = subject?.name || subject?.code || "";

    if (examName && subjectName) return `${examName} - ${subjectName}`;
    return examName || subjectName || "Examination";
};

const timeRange = (session) => {
    const start = session?.startTime || "";
    const end = session?.endTime || "";
    if (start && end) return `${start} - ${end}`;
    return start || end || "";
};

const scheduleLines = (schedule) => {
    const lines = [paperLabel(schedule.examination, schedule.subject)];
    const date = formatDate(schedule.date);
    const time = timeRange(schedule.session);

    if (date && time) lines.push(`${date}, ${time}`);
    else if (date) lines.push(date);
    else if (time) lines.push(time);

    if (schedule.reportingTime) lines.push(`Reporting: ${schedule.reportingTime}`);
    if (schedule.room?.building) lines.push(`Building: ${schedule.room.building}`);
    if (schedule.room?.roomNumber) lines.push(`Room: ${schedule.room.roomNumber}`);

    return lines;
};

const createNotification = async ({
    recipient,
    title,
    message,
    type = "system",
    referenceId = null,
    eventKey
}) => {
    if (!recipient || !title || !message || !eventKey) return false;

    try {
        await ensureIndexes();
        await Notification.create({
            recipient,
            title,
            message,
            type,
            referenceId: referenceId || null,
            eventKey
        });
        return true;
    } catch (error) {
        if (error.code === 11000 || error.code === 11001) return false;
        console.error("Notification delivery failed:", error.message);
        return false;
    }
};

const createExamNotificationsForStudents = async (studentIds, details) => {
    const recipients = [...new Set((studentIds || []).map(idOf).filter(Boolean))];
    let created = 0;

    for (const recipient of recipients) {
        const saved = await createNotification({
            ...details,
            recipient,
            type: details.type || "exam",
            eventKey: `${details.eventKey}:${recipient}`
        });
        if (saved) created += 1;
    }

    return created;
};

const notifySchedulePublished = async (schedule, studentIds) => {
    return createExamNotificationsForStudents(studentIds, {
        title: "Examination Schedule Published",
        message: scheduleLines(schedule).join("\n"),
        type: "exam",
        referenceId: schedule._id,
        eventKey: `exam-published:${idOf(schedule)}`
    });
};

const notifyRoomChanged = async (schedule, studentIds, fromRoom, toRoom) => {
    const fromLabel = fromRoom?.roomNumber || "";
    const toLabel = toRoom?.roomNumber || "";
    if (!toLabel || fromLabel === toLabel) return 0;

    const label = paperLabel(schedule.examination, schedule.subject);
    const message = fromLabel
        ? `Your ${label} examination room has changed from ${fromLabel} to ${toLabel}.`
        : `Your ${label} examination is now in room ${toLabel}.`;

    return createExamNotificationsForStudents(studentIds, {
        title: "Examination Room Changed",
        message,
        type: "exam",
        referenceId: schedule._id,
        eventKey: `exam-room:${idOf(schedule)}:${idOf(fromRoom) || "none"}:${idOf(toRoom)}`
    });
};

const notifyRescheduled = async (schedule, studentIds) => {
    const label = paperLabel(schedule.examination, schedule.subject);
    const when = [formatDate(schedule.date), timeRange(schedule.session)].filter(Boolean).join(", ");
    if (!when) return 0;

    const dateKey = new Date(schedule.date).toISOString().slice(0, 10);
    const sessionId = idOf(schedule.session);

    return createExamNotificationsForStudents(studentIds, {
        title: "Examination Rescheduled",
        message: `Your ${label} examination has been rescheduled to ${when}.`,
        type: "exam",
        referenceId: schedule._id,
        eventKey: `exam-reschedule:${idOf(schedule)}:${dateKey}:${sessionId}`
    });
};

const seatLines = (label, seat, changed) => {
    const lines = [
        changed
            ? `Your seat for ${label} has changed to:`
            : `Your seat for ${label} is:`
    ];

    if (seat.building) lines.push(`Building: ${seat.building}`);
    if (seat.roomNumber) lines.push(`Room: ${seat.roomNumber}`);
    if (seat.seatNumber) lines.push(`Seat: ${seat.seatNumber}`);
    return lines.join("\n");
};

const notifySeatingPublished = async ({ schedule, assignments, previousSeats = [] }) => {
    const populated = await Schedule.findById(schedule._id || schedule)
        .populate("examination", "title")
        .populate("subject", "name code");

    if (!populated) return 0;

    const label = paperLabel(populated.examination, populated.subject);
    const previous = new Map(previousSeats.map((seat) => [idOf(seat.student), seat]));
    let created = 0;

    for (const seat of assignments || []) {
        const studentId = idOf(seat.student);
        if (!studentId || !seat.seatNumber) continue;

        const prior = previous.get(studentId);
        const unchanged = prior
            && idOf(prior.room) === idOf(seat.room)
            && prior.seatNumber === seat.seatNumber;

        if (unchanged) continue;

        const changed = Boolean(prior);
        const saved = await createNotification({
            recipient: studentId,
            title: changed ? "Seat Allocation Updated" : "Seat Allocation Published",
            message: seatLines(label, seat, changed),
            type: "exam",
            referenceId: populated._id,
            eventKey: changed
                ? `seat-updated:${idOf(populated)}:${studentId}:${idOf(seat.room)}:${seat.seatNumber}`
                : `seat-published:${idOf(populated)}:${studentId}`
        });

        if (saved) created += 1;
    }

    return created;
};

const notifyResultPublished = async (result) => {
    const studentId = idOf(result.student);
    const examId = idOf(result.exam);
    if (!studentId || !result._id) return false;

    let exam = result.exam;
    if (!exam || !exam.subject && !exam.title) {
        exam = await Exam.findById(examId).select("subject title");
    }

    const subject = exam?.subject || exam?.title;
    if (!subject) return false;

    return createNotification({
        recipient: studentId,
        title: "Result Published",
        message: `Your ${subject} result has been published.`,
        type: "result",
        referenceId: result._id,
        eventKey: `result-published:${result._id}:${studentId}`
    });
};

const sessionLabel = (session) => {
    const name = session?.name || "";
    if (!name) return "";
    return /session/i.test(name) ? name : `${name} Session`;
};

const dutyLines = (schedule, room) => {
    const lines = [paperLabel(schedule.examination, schedule.subject)];
    const date = formatDate(schedule.date);
    const session = sessionLabel(schedule.session);

    if (date) lines.push(date);
    if (session) lines.push(session);
    if (schedule.reportingTime) lines.push(`Reporting: ${schedule.reportingTime}`);
    if (room?.roomNumber) lines.push(`Room: ${room.roomNumber}`);
    if (room?.building) lines.push(`Building: ${room.building}`);
    return lines.filter(Boolean);
};

const notifyDutyAssigned = async (duty, schedule, room) => {
    if (schedule.status !== "scheduled") return false;

    return createNotification({
        recipient: idOf(duty.faculty),
        title: "Invigilation Duty Assigned",
        message: dutyLines(schedule, room).join("\n"),
        type: "exam",
        referenceId: duty._id,
        eventKey: `duty-assigned:${idOf(duty)}`
    });
};

const notifyDutyRoomChanged = async (duty, schedule, fromRoom, toRoom) => {
    if (schedule.status !== "scheduled") return false;
    const fromLabel = fromRoom?.roomNumber || "";
    const toLabel = toRoom?.roomNumber || "";
    if (!fromLabel || !toLabel || fromLabel === toLabel) return false;

    return createNotification({
        recipient: idOf(duty.faculty),
        title: "Invigilation Duty Changed",
        message: `Your room has changed from ${fromLabel} to ${toLabel}.`,
        type: "exam",
        referenceId: duty._id,
        eventKey: `duty-room:${idOf(duty)}:${idOf(fromRoom)}:${idOf(toRoom)}`
    });
};

const notifyDutyRescheduled = async (duty, schedule) => {
    if (schedule.status !== "scheduled") return false;
    const label = paperLabel(schedule.examination, schedule.subject);
    const when = formatDate(schedule.date);
    if (!when) return false;

    return createNotification({
        recipient: idOf(duty.faculty),
        title: "Invigilation Duty Rescheduled",
        message: `Your duty for ${label} has moved to ${when}.`,
        type: "exam",
        referenceId: duty._id,
        eventKey: `duty-reschedule:${idOf(duty)}:${when}:${idOf(schedule.session)}`
    });
};

const notifyDutyCancelled = async (duty, schedule, room) => {
    if (schedule.status !== "scheduled") return false;
    const label = paperLabel(schedule.examination, schedule.subject);
    const roomLabel = room?.roomNumber ? ` in ${room.roomNumber}` : "";

    return createNotification({
        recipient: idOf(duty.faculty),
        title: "Invigilation Duty Cancelled",
        message: `Your invigilation duty for ${label}${roomLabel} has been cancelled.`,
        type: "exam",
        referenceId: duty._id,
        eventKey: `duty-cancelled:${idOf(duty)}`
    });
};

module.exports = {
    createNotification,
    createExamNotificationsForStudents,
    notifySchedulePublished,
    notifyRoomChanged,
    notifyRescheduled,
    notifySeatingPublished,
    notifyResultPublished,
    notifyDutyAssigned,
    notifyDutyRoomChanged,
    notifyDutyRescheduled,
    notifyDutyCancelled
};
