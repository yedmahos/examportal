const Exam = require("../models/Exam");
const Subject = require("../models/Subject");
const ExamSession = require("../models/ExamSession");
const Room = require("../models/Room");
const Schedule = require("../models/Schedule");
const RoomAllocation = require("../models/RoomAllocation");
const ExamEligibility = require("../models/ExamEligibility");
const { snapshotEligibleStudentIds } = require("../services/eligibilityService");
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
const {
    departmentScope,
    assertDepartment,
    ownedSubjectIds,
    restrictToIds
} = require("../utils/departmentScope");
const {
    notifySchedulePublished,
    notifyRoomChanged,
    notifyRescheduled
} = require("../services/notificationEvents");

const idOf = (value) => (value ? String(value._id || value) : "");

const notifyScheduleChange = async ({ previous, next, students, newcomers, staying }) => {
    try {
        if (next.status !== "scheduled") return;

        if (!previous || previous.status !== "scheduled") {
            await notifySchedulePublished(next, students);
            return;
        }

        if (newcomers.length) {
            await notifySchedulePublished(next, newcomers);
        }

        const dateChanged = previous.dateKey !== (next.date ? new Date(next.date).toISOString().slice(0, 10) : "");
        const sessionChanged = previous.sessionId !== idOf(next.session);
        const roomChanged = previous.roomId !== idOf(next.room);

        if (dateChanged || sessionChanged) {
            await notifyRescheduled(next, staying);
        }

        if (roomChanged) {
            await notifyRoomChanged(next, staying, previous.room, next.room);
        }
    } catch (error) {
        console.error("Schedule notification failed:", error.message);
    }
};

const withAllocations = async (items) => {
    const rows = await RoomAllocation.find({
        schedule: { $in: items.map((item) => item._id) }
    }).populate("room", "roomNumber building floor capacity");
    const grouped = new Map();

    rows.forEach((row) => {
        const key = String(row.schedule);
        const list = grouped.get(key) || [];
        list.push(row);
        grouped.set(key, list);
    });

    return items.map((item) => ({
        ...item.toObject(),
        allocations: grouped.get(String(item._id)) || []
    }));
};

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

    if (subject.verificationStatus !== "verified") {
        const error = new Error("Subject must be verified before it can be scheduled");
        error.status = 400;
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

    const students = await snapshotEligibleStudentIds({
        examinationId: examination._id,
        subjectId: subject._id
    });

    if (status === "scheduled" && students.length === 0) {
        const error = new Error("No eligible students found for this examination and subject.");
        error.status = 400;
        throw error;
    }

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

        await notifyScheduleChange({
            previous: null,
            next: item,
            students: item.eligibleStudents || [],
            newcomers: [],
            staying: []
        });

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

        restrictToIds(query, "subject", await ownedSubjectIds(await departmentScope(req)));

        const [items, total] = await Promise.all([
            populateSchedule(Schedule.find(query).sort({ date: 1 }).skip(skip).limit(limit)),
            Schedule.countDocuments(query)
        ]);

        res.status(200).json({
            items: await withAllocations(items),
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
            const stillEligible = allowed && await studentRetainsEligibility(item, req.user.userId);

            if (!stillEligible || item.status !== "scheduled") {
                return res.status(403).json({ message: "Access denied" });
            }
        } else if (req.user.role === "department_admin") {
            const subject = await Subject.findById(item.subject?._id || item.subject).select("department");
            assertDepartment(await departmentScope(req), subject?.department);
        }

        const allocations = await RoomAllocation.find({ schedule: item._id })
            .populate("room", "roomNumber building floor capacity");

        res.status(200).json({ item, allocations });
    } catch (error) {
        return handleError(res, error, "Get schedule error:");
    }
};

const updateSchedule = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "schedule id");

        const current = await Schedule.findById(req.params.id);

        if (!current) return res.status(404).json({ message: "Schedule not found" });

        const previousStudents = new Set((current.eligibleStudents || []).map((studentId) => String(studentId)));
        const previous = {
            status: current.status,
            dateKey: current.date ? new Date(current.date).toISOString().slice(0, 10) : "",
            sessionId: idOf(current.session),
            roomId: idOf(current.room),
            room: current.room ? await Room.findById(current.room).select("roomNumber building") : null
        };

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
        const nextStudents = (item.eligibleStudents || []).map((studentId) => String(studentId));

        await notifyScheduleChange({
            previous,
            next: item,
            students: nextStudents,
            newcomers: nextStudents.filter((studentId) => !previousStudents.has(studentId)),
            staying: nextStudents.filter((studentId) => previousStudents.has(studentId))
        });

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

const studentRetainsEligibility = async (schedule, studentId) => {
    const examinationId = schedule.examination?._id || schedule.examination;
    const subjectId = schedule.subject?._id || schedule.subject;
    const row = await ExamEligibility.findOne({
        student: studentId,
        examination: examinationId,
        subject: subjectId,
        eligibilityStatus: { $in: ["eligible", "registered"] }
    }).select("_id");

    return Boolean(row);
};

const mySchedules = async (req, res) => {
    try {
        const items = await populateSchedule(
            Schedule.find({
                eligibleStudents: req.user.userId,
                status: "scheduled"
            }).sort({ date: 1 })
        );
        const visible = [];

        for (const item of items) {
            if (await studentRetainsEligibility(item, req.user.userId)) {
                visible.push(item);
            }
        }

        res.status(200).json({ items: visible });
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
