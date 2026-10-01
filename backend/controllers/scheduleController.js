const Exam = require("../models/Exam");
const Subject = require("../models/Subject");
const ExamSession = require("../models/ExamSession");
const Room = require("../models/Room");
const Schedule = require("../models/Schedule");
const { eligibleStudentIds } = require("../services/eligibilityService");
const {
    detectConflicts,
    hasBlockingConflict
} = require("../services/conflictDetectionService");
const {
    parsePagination,
    paginationMeta
} = require("../utils/query");
const {
    isObjectId,
    invalidId,
    handleError,
    parseDateOnly,
    isTime
} = require("../utils/http");

const populateSchedule = (query) => {
    return query
        .populate("examination", "title instructions examType semester startDate endDate")
        .populate("subject", "code name subjectType duration")
        .populate("session", "name code reportingTime startTime endTime duration")
        .populate("room", "roomNumber building floor capacity")
        .populate("createdBy", "name role");
};

const loadScheduleInput = async (body) => {
    const date = parseDateOnly(body.date);

    if (!isObjectId(body.examination) || !isObjectId(body.subject) || !isObjectId(body.session) || !date) {
        const error = new Error("Examination, subject, date and session are required");
        error.status = 400;
        throw error;
    }

    const [examination, subject, session] = await Promise.all([
        Exam.findOne({ _id: body.examination, isArchived: false }),
        Subject.findById(body.subject),
        ExamSession.findById(body.session)
    ]);

    if (!examination) {
        const error = new Error("Examination not found");
        error.status = 404;
        throw error;
    }

    if (!subject || subject.status !== "active") {
        const error = new Error("Active subject not found");
        error.status = 404;
        throw error;
    }

    if (!session) {
        const error = new Error("Session not found");
        error.status = 404;
        throw error;
    }

    let room = null;

    if (body.room) {
        if (!isObjectId(body.room)) {
            const error = new Error("Invalid room id");
            error.status = 400;
            throw error;
        }
        room = await Room.findById(body.room);
        if (!room) {
            const error = new Error("Room not found");
            error.status = 404;
            throw error;
        }
    }

    const status = body.status || "scheduled";

    if (!["draft", "scheduled"].includes(status)) {
        const error = new Error("Status must be draft or scheduled");
        error.status = 400;
        throw error;
    }

    if (status === "scheduled" && !room) {
        const error = new Error("A room is required before a schedule can be saved as scheduled");
        error.status = 400;
        throw error;
    }

    const duration = body.duration ? Number(body.duration) : (subject.duration || session.duration);

    if (!Number.isFinite(duration) || duration < 1) {
        const error = new Error("Duration must be greater than 0");
        error.status = 400;
        throw error;
    }

    const reportingTime = body.reportingTime || session.reportingTime;

    if (!isTime(reportingTime)) {
        const error = new Error("Reporting time must use HH:MM");
        error.status = 400;
        throw error;
    }

    if (examination.startDate && date < examination.startDate) {
        const error = new Error("Schedule date is before the examination start date");
        error.status = 400;
        throw error;
    }

    if (examination.endDate && date > examination.endDate) {
        const error = new Error("Schedule date is after the examination end date");
        error.status = 400;
        throw error;
    }

    const students = await eligibleStudentIds({
        examinationId: examination._id,
        subjectId: subject._id
    });

    return {
        examination,
        subject,
        session,
        room,
        date,
        status,
        duration,
        reportingTime,
        students
    };
};

const conflictPayload = async (input, ignoreScheduleId) => {
    return detectConflicts({
        examinationId: input.examination._id,
        subjectId: input.subject._id,
        date: input.date,
        sessionId: input.session._id,
        roomId: input.room ? input.room._id : null,
        eligibleStudentIds: input.students,
        ignoreScheduleId
    });
};

const createSchedule = async (req, res) => {
    try {
        const input = await loadScheduleInput(req.body);
        const conflicts = await conflictPayload(input);

        if (hasBlockingConflict(conflicts)) {
            return res.status(409).json({
                message: "Blocking conflicts prevent this schedule from being saved",
                ...conflicts
            });
        }

        const created = await Schedule.create({
            examination: input.examination._id,
            subject: input.subject._id,
            date: input.date,
            session: input.session._id,
            duration: input.duration,
            reportingTime: input.reportingTime,
            room: input.room ? input.room._id : undefined,
            status: input.status,
            eligibleStudents: input.students,
            warnings: conflicts.conflicts.filter((item) => item.severity === "warning"),
            createdBy: req.user.userId
        });

        const item = await populateSchedule(Schedule.findById(created._id));

        res.status(201).json({
            message: "Schedule saved",
            item,
            ...conflicts
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        return handleError(res, error, "Create schedule error:");
    }
};

const listSchedules = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const query = {};

        if (req.query.examination) {
            if (!isObjectId(req.query.examination)) return invalidId(res, "examination id");
            query.examination = req.query.examination;
        }

        if (req.query.subject) {
            if (!isObjectId(req.query.subject)) return invalidId(res, "subject id");
            query.subject = req.query.subject;
        }

        if (req.query.status === "draft" || req.query.status === "scheduled") {
            query.status = req.query.status;
        }

        if (req.query.date) {
            const date = parseDateOnly(req.query.date);
            if (!date) return res.status(400).json({ message: "Invalid date" });
            query.date = date;
        }

        const [items, total] = await Promise.all([
            populateSchedule(Schedule.find(query).sort({ date: 1 }).skip(skip).limit(limit)),
            Schedule.countDocuments(query)
        ]);

        res.status(200).json({
            items,
            ...paginationMeta({ page, limit, total })
        });
    } catch (error) {
        return handleError(res, error, "List schedules error:");
    }
};

const getSchedule = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "schedule id");

        const item = await populateSchedule(Schedule.findById(req.params.id));

        if (!item) return res.status(404).json({ message: "Schedule not found" });

        if (req.user.role === "student") {
            const allowed = (item.eligibleStudents || []).some(
                (studentId) => String(studentId) === String(req.user.userId)
            );

            if (!allowed || item.status !== "scheduled") {
                return res.status(403).json({ message: "Access denied" });
            }
        }

        res.status(200).json({ item });
    } catch (error) {
        return handleError(res, error, "Get schedule error:");
    }
};

const updateSchedule = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "schedule id");

        const current = await Schedule.findById(req.params.id);

        if (!current) return res.status(404).json({ message: "Schedule not found" });

        const input = await loadScheduleInput({
            examination: req.body.examination || current.examination,
            subject: req.body.subject || current.subject,
            date: req.body.date || current.date.toISOString().slice(0, 10),
            session: req.body.session || current.session,
            room: req.body.room === undefined ? current.room : req.body.room,
            duration: req.body.duration || current.duration,
            reportingTime: req.body.reportingTime || current.reportingTime,
            status: req.body.status || current.status
        });

        const conflicts = await conflictPayload(input, current._id);

        if (hasBlockingConflict(conflicts)) {
            return res.status(409).json({
                message: "Blocking conflicts prevent this schedule from being saved",
                ...conflicts
            });
        }

        current.examination = input.examination._id;
        current.subject = input.subject._id;
        current.date = input.date;
        current.session = input.session._id;
        current.duration = input.duration;
        current.reportingTime = input.reportingTime;
        current.room = input.room ? input.room._id : undefined;
        current.status = input.status;
        current.eligibleStudents = input.students;
        current.warnings = conflicts.conflicts.filter((item) => item.severity === "warning");
        await current.save();

        const item = await populateSchedule(Schedule.findById(current._id));

        res.status(200).json({
            message: "Schedule updated",
            item,
            ...conflicts
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        return handleError(res, error, "Update schedule error:");
    }
};

const deleteSchedule = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "schedule id");

        const item = await Schedule.findByIdAndDelete(req.params.id);

        if (!item) return res.status(404).json({ message: "Schedule not found" });

        res.status(200).json({ message: "Schedule deleted" });
    } catch (error) {
        return handleError(res, error, "Delete schedule error:");
    }
};

const mySchedules = async (req, res) => {
    try {
        const items = await populateSchedule(
            Schedule.find({
                eligibleStudents: req.user.userId,
                status: "scheduled"
            }).sort({ date: 1 })
        );

        res.status(200).json({ items });
    } catch (error) {
        return handleError(res, error, "My schedules error:");
    }
};

const previewSchedule = async (req, res) => {
    try {
        const input = await loadScheduleInput({
            ...req.body,
            status: req.body.status || "draft",
            room: req.body.room || undefined
        });
        const conflicts = await conflictPayload(input, req.body.ignoreScheduleId);

        res.status(200).json({
            eligibleStudents: input.students.length,
            ...conflicts
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        return handleError(res, error, "Preview schedule error:");
    }
};

module.exports = {
    createSchedule,
    listSchedules,
    getSchedule,
    updateSchedule,
    deleteSchedule,
    mySchedules,
    previewSchedule
};
