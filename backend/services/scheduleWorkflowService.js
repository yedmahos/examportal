/**
 * Schedule approval and version history.
 *
 * Role mapping (no Controller login role exists):
 * - examination_cell submits drafts, moves Exam Cell Review to department
 *   verification, edits draft versions, and publishes after academic approval.
 * - department_admin verifies or returns only schedules in their department.
 *   super_admin does not satisfy this step.
 * - super_admin and legacy admin perform Controller / Academic Approval.
 * - super_admin may also submit and publish, matching existing staff grants.
 * - faculty and students cannot manage approval or versions.
 *
 * Schedule.status and Exam.status stay operational. Approval stage lives on
 * ScheduleApproval. Version snapshots live on ScheduleVersion.
 */
const Exam = require("../models/Exam");
const Subject = require("../models/Subject");
const ExamSession = require("../models/ExamSession");
const Room = require("../models/Room");
const User = require("../models/User");
const Schedule = require("../models/Schedule");
const ScheduleApproval = require("../models/ScheduleApproval");
const ScheduleVersion = require("../models/ScheduleVersion");
const RoomAllocation = require("../models/RoomAllocation");
const SeatAllocation = require("../models/SeatAllocation");
const SeatingPlan = require("../models/SeatingPlan");
const InvigilationDuty = require("../models/InvigilationDuty");
const ActivityLog = require("../models/ActivityLog");
const Department = require("../models/Department");
const { snapshotEligibleStudentIds } = require("./eligibilityService");
const { detectConflicts, hasBlockingConflict } = require("./conflictDetectionService");
const { logActivity } = require("./activityLogger");
const { syncDutiesAfterScheduleChange } = require("./invigilationService");
const {
    notifySchedulePublished,
    notifyRoomChanged,
    notifyRescheduled,
    notifyDutyRoomChanged,
    createNotification,
    createExamNotificationsForStudents
} = require("./notificationEvents");
const {
    departmentScope,
    assertDepartment,
    ownedSubjectIds
} = require("../utils/departmentScope");
const { isObjectId, parseDateOnly, dateKey, isTime } = require("../utils/http");

const STAGES = ScheduleApproval.STAGES;
const LOCK_MESSAGE = "This schedule is published and locked. Create a new version to make changes.";

const fail = (status, message) => {
    const error = new Error(message);
    error.status = status;
    throw error;
};

const idOf = (value) => (value ? String(value._id || value) : "");

const isManager = (role) => ["examination_cell", "super_admin", "admin"].includes(role);
const isAcademic = (role) => ["super_admin", "admin"].includes(role);

const FIELD_DEFS = [
    ["date", "Date", (snapshot) => snapshot?.date || ""],
    ["session", "Session", (snapshot) => snapshot?.session?.name || ""],
    ["startTime", "Start time", (snapshot) => snapshot?.session?.startTime || ""],
    ["endTime", "End time", (snapshot) => snapshot?.session?.endTime || ""],
    ["reportingTime", "Reporting time", (snapshot) => snapshot?.reportingTime || ""],
    ["room", "Room", (snapshot) => snapshot?.room?.roomNumber || ""],
    ["building", "Building", (snapshot) => snapshot?.room?.building || ""],
    ["duration", "Duration", (snapshot) => String(snapshot?.duration || "")],
    ["instructions", "Instructions", (snapshot) => snapshot?.instructions || ""],
    ["subject", "Subject", (snapshot) => snapshot?.subject?.code || snapshot?.subject?.name || ""],
    ["operationalChange", "Change", (snapshot) => snapshot?.operationalChange || ""]
];

const diffSnapshots = (from, to) => FIELD_DEFS.flatMap(([field, label, read]) => {
    const left = read(from);
    const right = read(to);
    if (left === right) return [];
    return [{ field, label, from: left, to: right }];
});

const summarize = (changes) => changes.map((change) => `${change.label}: ${change.from || "—"} → ${change.to || "—"}`).join("; ");

const publicSnapshot = (snapshot) => {
    if (!snapshot) return null;
    return {
        examination: snapshot.examination || null,
        subject: snapshot.subject || null,
        date: snapshot.date || "",
        session: snapshot.session || null,
        reportingTime: snapshot.reportingTime || "",
        duration: snapshot.duration || null,
        room: snapshot.room || null,
        status: snapshot.status || "",
        instructions: snapshot.instructions || "",
        operationalChange: snapshot.operationalChange || "",
        program: snapshot.program || null,
        semester: snapshot.semester || null,
        academicYear: snapshot.academicYear || null,
        department: snapshot.department || null,
        eligibleStudents: (snapshot.eligibleStudentIds || []).length,
        allocations: snapshot.allocations || [],
        seating: snapshot.seating || null,
        duties: snapshot.duties || []
    };
};

const buildSnapshot = async (scheduleId) => {
    const schedule = await Schedule.findById(scheduleId)
        .populate({
            path: "examination",
            select: "title instructions semester department program",
            populate: [
                { path: "departmentRef", select: "name code" },
                { path: "programRef", select: "name code" },
                { path: "academicYearRef", select: "name" }
            ]
        })
        .populate({
            path: "subject",
            select: "code name department program semester",
            populate: [
                { path: "department", select: "name code" },
                { path: "program", select: "name code" }
            ]
        })
        .populate("session", "name startTime endTime reportingTime")
        .populate("room", "roomNumber building");

    if (!schedule) fail(404, "Schedule not found");

    const [allocations, plan, duties] = await Promise.all([
        RoomAllocation.find({ schedule: scheduleId }).populate("room", "roomNumber building"),
        SeatingPlan.findOne({ schedule: scheduleId }).sort({ version: -1 }),
        InvigilationDuty.find({ schedule: scheduleId, status: { $in: ["assigned", "completed"] } })
            .populate("faculty", "name")
            .populate("room", "roomNumber building")
    ]);

    const examination = schedule.examination || {};
    const subject = schedule.subject || {};

    return {
        examination: { id: idOf(examination), title: examination.title || "" },
        subject: {
            id: idOf(subject),
            code: subject.code || "",
            name: subject.name || "",
            departmentId: idOf(subject.department),
            departmentName: subject.department?.name || ""
        },
        date: dateKey(schedule.date),
        session: schedule.session ? {
            id: idOf(schedule.session),
            name: schedule.session.name || "",
            startTime: schedule.session.startTime || "",
            endTime: schedule.session.endTime || ""
        } : null,
        reportingTime: schedule.reportingTime || "",
        duration: schedule.duration,
        room: schedule.room ? {
            id: idOf(schedule.room),
            roomNumber: schedule.room.roomNumber || "",
            building: schedule.room.building || ""
        } : null,
        status: schedule.status,
        instructions: examination.instructions || "",
        operationalChange: schedule.operationalState || "",
        program: examination.programRef?.name || examination.program || subject.program?.name || "",
        semester: examination.semester || subject.semester || null,
        academicYear: examination.academicYearRef?.name || "",
        department: subject.department ? {
            id: idOf(subject.department),
            name: subject.department.name || "",
            code: subject.department.code || ""
        } : null,
        eligibleStudentIds: (schedule.eligibleStudents || []).map(idOf).filter(Boolean),
        allocations: allocations.map((allocation) => ({
            roomNumber: allocation.room?.roomNumber || "",
            building: allocation.room?.building || "",
            allocatedStudents: allocation.allocatedStudents
        })),
        seating: plan ? {
            strategy: plan.strategy,
            status: plan.status,
            studentCount: plan.studentCount
        } : null,
        duties: duties.map((duty) => ({
            facultyName: duty.faculty?.name || "",
            roomNumber: duty.room?.roomNumber || "",
            status: duty.status,
            reportingTime: duty.reportingTime || ""
        }))
    };
};

const loadScheduleForActor = async (req) => {
    if (!isObjectId(req.params.id)) fail(400, "Invalid schedule id");
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) fail(404, "Schedule not found");

    if (req.user.role === "student" || req.user.role === "faculty") {
        fail(403, "Access denied");
    }

    if (req.user.role === "department_admin") {
        const subject = await Subject.findById(schedule.subject).select("department");
        assertDepartment(await departmentScope(req), subject?.department);
    }

    return schedule;
};

const namesFor = async (ids) => {
    const users = await User.find({ _id: { $in: ids.filter(Boolean) } }).select("name role");
    return new Map(users.map((user) => [String(user._id), { name: user.name, role: user.role }]));
};

const presentHistory = (history, users) => (history || []).map((entry) => ({
    action: entry.action,
    stage: entry.stage,
    status: entry.status,
    reason: entry.reason || "",
    fromStage: entry.fromStage || "",
    toStage: entry.toStage || "",
    version: entry.version || null,
    at: entry.at,
    actor: users.get(String(entry.actor)) || null
}));

const nextActor = (approval) => {
    if (!approval) return "Examination Cell";
    if (approval.stage === "PUBLISHED") return "Examination Cell";
    if (approval.stage === "ACADEMIC_APPROVAL" && approval.status === "approved") return "Examination Cell";
    if (approval.stage === "ACADEMIC_APPROVAL") return "Super Admin";
    if (approval.stage === "DEPARTMENT_VERIFICATION") return "Department Admin";
    return "Examination Cell";
};

const presentApproval = async (schedule) => {
    const approval = await ScheduleApproval.findOne({ schedule: schedule._id });
    if (!approval) {
        return {
            stage: "DRAFT",
            status: "pending",
            currentVersion: null,
            publishedVersion: schedule.publishedVersion || null,
            locked: Boolean(schedule.workflowLocked),
            operationalState: schedule.operationalState || "",
            nextActor: "Examination Cell",
            history: []
        };
    }

    const users = await namesFor(approval.history.map((entry) => entry.actor));
    const history = presentHistory(approval.history, users);

    return {
        stage: approval.stage,
        status: approval.status,
        currentVersion: approval.currentVersion,
        publishedVersion: schedule.publishedVersion || null,
        locked: Boolean(schedule.workflowLocked),
        operationalState: schedule.operationalState || "",
        nextActor: nextActor(approval),
        history,
        latest: history.length ? history[history.length - 1] : null
    };
};

const presentVersion = async (version, users) => ({
    versionNumber: version.versionNumber,
    state: version.state,
    createdAt: version.createdAt,
    publishedAt: version.publishedAt || null,
    archivedAt: version.archivedAt || null,
    changeReason: version.changeReason || "",
    changeSummary: version.changeSummary || "",
    parentVersion: version.parentVersion,
    createdBy: users.get(String(version.createdBy)) || null,
    publishedBy: version.publishedBy ? users.get(String(version.publishedBy)) || null : null,
    snapshot: publicSnapshot(version.snapshot),
    affected: version.affected || null
});

const remember = async (approval, { action, actor, reason = "", fromStage, toStage, status, version }) => {
    approval.history.push({
        action,
        actor,
        reason,
        fromStage,
        toStage,
        status,
        version: version || approval.currentVersion,
        stage: toStage,
        at: new Date()
    });
    approval.stage = toStage;
    approval.status = status;
    if (version) approval.currentVersion = version;
    await approval.save();
    await logActivity({
        user: actor,
        action,
        entity: "Schedule",
        entityId: approval.schedule,
        description: reason
            ? `${String(action).replace(/_/g, " ")} version ${version || approval.currentVersion}: ${reason}`
            : `${String(action).replace(/_/g, " ")} version ${version || approval.currentVersion}`
    });
};

const ensureInitialVersion = async (schedule, actor) => {
    const existing = await ScheduleApproval.findOne({ schedule: schedule._id });
    if (existing) return existing;

    const snapshot = await buildSnapshot(schedule._id);
    await ScheduleVersion.create({
        schedule: schedule._id,
        versionNumber: 1,
        state: "draft",
        snapshot,
        createdBy: actor,
        changeSummary: "Initial version",
        changeReason: "",
        parentVersion: null
    });
    const approval = await ScheduleApproval.create({
        schedule: schedule._id,
        stage: "DRAFT",
        status: "pending",
        currentVersion: 1,
        history: []
    });
    await logActivity({
        user: actor,
        action: "version_created",
        entity: "Schedule",
        entityId: schedule._id,
        description: "Created version 1"
    });
    return approval;
};

const currentDraft = async (scheduleId, versionNumber) => {
    return ScheduleVersion.findOne({
        schedule: scheduleId,
        versionNumber,
        state: "draft"
    });
};

const assertExamWindow = async (schedule, date) => {
    const examination = await Exam.findById(schedule.examination).select("startDate endDate instructions");
    if (!examination) fail(404, "Examination not found");
    if (examination.startDate && date < examination.startDate) {
        fail(400, "Schedule date is before the examination start date");
    }
    if (examination.endDate && date > examination.endDate) {
        fail(400, "Schedule date is after the examination end date");
    }
    return examination;
};

const applyEdits = async (snapshot, body, schedule) => {
    const recognized = ["date", "session", "reportingTime", "duration", "room", "instructions", "operationalChange"];
    if (!recognized.some((field) => body[field] !== undefined)) {
        fail(400, "Invalid change request");
    }

    const next = JSON.parse(JSON.stringify(snapshot || {}));

    if (body.date !== undefined) {
        const date = parseDateOnly(body.date);
        if (!date) fail(400, "Invalid date");
        await assertExamWindow(schedule, date);
        next.date = body.date;
    }

    if (body.session !== undefined) {
        if (!isObjectId(body.session)) fail(400, "Invalid session id");
        const session = await ExamSession.findById(body.session);
        if (!session) fail(404, "Session not found");
        next.session = {
            id: String(session._id),
            name: session.name,
            startTime: session.startTime,
            endTime: session.endTime
        };
        if (body.reportingTime === undefined) next.reportingTime = session.reportingTime;
    }

    if (body.reportingTime !== undefined) {
        if (!isTime(body.reportingTime)) fail(400, "Reporting time must use HH:MM");
        next.reportingTime = body.reportingTime;
    }

    if (body.duration !== undefined) {
        const duration = Number(body.duration);
        if (!Number.isFinite(duration) || duration < 1) fail(400, "Duration must be greater than 0");
        next.duration = duration;
    }

    if (body.room !== undefined) {
        if (!isObjectId(body.room)) fail(400, "Invalid room id");
        const room = await Room.findById(body.room).select("roomNumber building");
        if (!room) fail(404, "Room not found");
        next.room = {
            id: String(room._id),
            roomNumber: room.roomNumber,
            building: room.building
        };
    }

    if (body.instructions !== undefined) next.instructions = String(body.instructions || "");

    if (body.operationalChange !== undefined) {
        const value = String(body.operationalChange || "");
        if (!["", "postponed", "cancelled"].includes(value)) fail(400, "Invalid change request");
        next.operationalChange = value;
    }

    return next;
};

const syncUnlockedDraft = async (schedule, snapshot) => {
    if (schedule.workflowLocked || schedule.status !== "draft") return;
    const date = parseDateOnly(snapshot.date);
    if (date) schedule.date = date;
    if (snapshot.session?.id) schedule.session = snapshot.session.id;
    if (snapshot.room?.id) schedule.room = snapshot.room.id;
    if (snapshot.reportingTime) schedule.reportingTime = snapshot.reportingTime;
    if (snapshot.duration) schedule.duration = snapshot.duration;
    schedule.operationalState = snapshot.operationalChange || "";
    await schedule.save();
};

const parentSnapshot = async (version) => {
    if (!version.parentVersion) return null;
    const parent = await ScheduleVersion.findOne({
        schedule: version.schedule,
        versionNumber: version.parentVersion
    });
    return parent?.snapshot || null;
};

const refreshDraftSnapshot = async (scheduleId) => {
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule || schedule.workflowLocked) return;

    const approval = await ScheduleApproval.findOne({ schedule: scheduleId });
    if (!approval) return;

    const version = await currentDraft(scheduleId, approval.currentVersion);
    if (!version) return;

    const operationalChange = version.snapshot?.operationalChange || schedule.operationalState || "";
    const snapshot = await buildSnapshot(scheduleId);
    snapshot.operationalChange = operationalChange;
    const changes = diffSnapshots(await parentSnapshot(version), snapshot);
    version.snapshot = snapshot;
    version.changeSummary = changes.length ? summarize(changes) : version.changeSummary;
    version.comparison = { changedFields: changes.map((change) => change.field) };
    version.markModified("snapshot");
    version.markModified("comparison");
    await version.save();

    if (approval.stage !== "DRAFT") {
        await remember(approval, {
            action: "changed",
            actor: schedule.createdBy,
            fromStage: approval.stage,
            toStage: "DRAFT",
            status: "pending",
            version: version.versionNumber,
            reason: "Schedule draft changed before publication"
        });
    }
};

const notifyScheduleChange = async ({ previous, next, students, newcomers, staying }) => {
    if (next.status !== "scheduled") return;

    if (!previous || previous.status !== "scheduled") {
        await notifySchedulePublished(next, students);
        return;
    }

    if (newcomers.length) await notifySchedulePublished(next, newcomers);

    const dateChanged = previous.dateKey !== dateKey(next.date);
    const sessionChanged = previous.sessionId !== idOf(next.session);
    const roomChanged = previous.roomId !== idOf(next.room);

    if (dateChanged || sessionChanged) await notifyRescheduled(next, staying);
    if (roomChanged) await notifyRoomChanged(next, staying, previous.room, next.room);
};

const alignPublishedDependencies = async (previous, schedule, populated) => {
    const limitations = [];

    if (previous.roomId && schedule.room && previous.roomId !== idOf(schedule.room)) {
        const duties = await InvigilationDuty.find({
            schedule: schedule._id,
            status: "assigned",
            room: previous.roomId
        });
        const toRoom = await Room.findById(schedule.room).select("roomNumber building");

        for (const duty of duties) {
            duty.room = schedule.room;
            await duty.save();
            try {
                await notifyDutyRoomChanged(duty, populated, previous.room, toRoom);
            } catch (error) {
                console.error("Duty notification failed:", error.message);
            }
        }

        const existing = await RoomAllocation.findOne({ schedule: schedule._id, room: schedule.room });
        const previousAllocation = await RoomAllocation.findOne({ schedule: schedule._id, room: previous.roomId });
        if (previousAllocation && !existing) {
            previousAllocation.room = schedule.room;
            await previousAllocation.save();
        } else if (previousAllocation && existing) {
            limitations.push("The previous room allocation was kept because the new room is already allocated on this schedule.");
        }

        const seats = await SeatAllocation.find({ schedule: schedule._id, room: previous.roomId });
        const blocked = [];
        for (const seat of seats) {
            const clash = await SeatAllocation.findOne({
                seatingPlan: seat.seatingPlan,
                room: schedule.room,
                seatNumber: seat.seatNumber
            });
            if (clash) blocked.push(seat._id);
        }
        if (blocked.length) {
            limitations.push("Some seats could not move because the new room already has those seat numbers.");
        } else if (seats.length) {
            await SeatAllocation.updateMany(
                { schedule: schedule._id, room: previous.roomId },
                { $set: { room: schedule.room } }
            );
        }
    }

    await RoomAllocation.updateMany(
        { schedule: schedule._id },
        { $set: { date: schedule.date, session: schedule.session } }
    );

    return limitations;
};

const notifyDepartment = async (schedule, versionNumber, snapshot) => {
    const departmentId = snapshot.department?.id || snapshot.subject?.departmentId;
    if (!departmentId) return;

    const admins = await User.find({
        role: "department_admin",
        departmentRef: departmentId,
        status: "active"
    }).select("_id");

    const label = [snapshot.examination?.title, snapshot.subject?.code || snapshot.subject?.name].filter(Boolean).join(" - ");

    for (const admin of admins) {
        await createNotification({
            recipient: admin._id,
            title: "Department Schedule Published",
            message: `${label || "A department examination"} version ${versionNumber} is now the published schedule.`,
            type: "exam",
            referenceId: schedule._id,
            eventKey: `schedule-dept:${idOf(schedule)}:v${versionNumber}:${idOf(admin._id)}`
        });
    }
};

const notifyOperationalChange = async (schedule, students, snapshot, versionNumber, previous) => {
    if (snapshot.operationalChange === "cancelled" && previous.operationalState !== "cancelled") {
        await createExamNotificationsForStudents(students, {
            title: "Examination Cancelled",
            message: `${snapshot.examination?.title || "An examination"} - ${snapshot.subject?.name || "paper"} has been cancelled.`,
            type: "exam",
            referenceId: schedule._id,
            eventKey: `exam-cancelled:${idOf(schedule)}:v${versionNumber}`
        });
    }

    if (snapshot.operationalChange === "postponed" && previous.operationalState !== "postponed") {
        const dateChanged = previous.dateKey !== snapshot.date;
        const sessionChanged = previous.sessionId !== (snapshot.session?.id || "");
        if (!dateChanged && !sessionChanged) {
            await createExamNotificationsForStudents(students, {
                title: "Examination Postponed",
                message: `${snapshot.examination?.title || "An examination"} - ${snapshot.subject?.name || "paper"} has been postponed.`,
                type: "exam",
                referenceId: schedule._id,
                eventKey: `exam-postponed:${idOf(schedule)}:v${versionNumber}`
            });
        }
    }
};

const collectImpact = async (schedule, snapshot, baseline) => {
    const changes = diffSnapshots(baseline, snapshot);
    const examinationId = schedule.examination?._id || schedule.examination;
    const subjectId = schedule.subject?._id || schedule.subject;
    const eligible = await snapshotEligibleStudentIds({ examinationId, subjectId });
    const studentIds = [...new Set([...(snapshot.eligibleStudentIds || []), ...eligible.map(idOf)].filter(Boolean))];
    const duties = await InvigilationDuty.find({ schedule: schedule._id, status: "assigned" })
        .populate("faculty", "name departmentRef")
        .populate("room", "roomNumber");
    const faculty = [];
    const seenFaculty = new Set();
    const departmentIds = new Set();
    if (snapshot.department?.id) departmentIds.add(snapshot.department.id);
    if (snapshot.subject?.departmentId) departmentIds.add(snapshot.subject.departmentId);

    duties.forEach((duty) => {
        const facultyId = idOf(duty.faculty);
        if (facultyId && !seenFaculty.has(facultyId)) {
            seenFaculty.add(facultyId);
            faculty.push({ name: duty.faculty?.name || "Faculty" });
        }
        const departmentId = idOf(duty.faculty?.departmentRef);
        if (departmentId) departmentIds.add(departmentId);
    });

    const departments = await Department.find({ _id: { $in: [...departmentIds] } }).select("name code");

    return {
        students: studentIds.length,
        faculty: faculty.length,
        departments: departments.length,
        facultyNames: faculty.map((person) => person.name),
        departmentNames: departments.map((department) => department.name),
        changes,
        allocations: snapshot.allocations || [],
        seating: snapshot.seating || null,
        limitations: [
            "Seating plans are not regenerated when a published room changes. Seats already in the previous schedule room move only when the new room does not already use those seat numbers."
        ]
    };
};

const validatePublishable = async (schedule, snapshot) => {
    if (!snapshot?.date || !snapshot.session?.id) fail(400, "No draft version is available to publish.");
    const date = parseDateOnly(snapshot.date);
    if (!date) fail(400, "Invalid date");
    await assertExamWindow(schedule, date);

    if (snapshot.operationalChange !== "cancelled" && !snapshot.room?.id) {
        fail(400, "A room is required before this schedule can be published.");
    }

    const students = (snapshot.eligibleStudentIds || []).filter(isObjectId);
    if (snapshot.operationalChange !== "cancelled" && students.length === 0) {
        fail(400, "No eligible students found for this examination and subject.");
    }

    const conflicts = await detectConflicts({
        examinationId: schedule.examination,
        subjectId: schedule.subject,
        date,
        sessionId: snapshot.session.id,
        roomId: snapshot.room?.id || null,
        eligibleStudentIds: students,
        ignoreScheduleId: schedule._id
    });

    if (hasBlockingConflict(conflicts)) {
        fail(409, "Blocking conflicts prevent this schedule from being published.");
    }

    return { date, students, conflicts };
};

const publishVersion = async (req) => {
    if (!isManager(req.user.role)) fail(403, "Access denied");
    if (req.body?.confirmImpact !== true) {
        fail(400, "Review the schedule change impact before publication.");
    }

    const schedule = await loadScheduleForActor(req);
    const approval = await ScheduleApproval.findOne({ schedule: schedule._id });
    if (!approval) fail(409, "Academic approval is required before publication.");
    if (approval.stage === "PUBLISHED" && approval.status === "approved") {
        fail(409, "This schedule is already published. Create a new version to make changes.");
    }
    if (approval.stage !== "ACADEMIC_APPROVAL" || approval.status !== "approved") {
        fail(409, "Academic approval is required before publication.");
    }

    const version = await currentDraft(schedule._id, approval.currentVersion);
    if (!version) fail(409, "No draft version is available to publish.");

    const fresh = await Schedule.findById(schedule._id);
    const snapshot = version.snapshot || {};
    const { date, students } = await validatePublishable(fresh, snapshot);
    const previousStudents = new Set((fresh.eligibleStudents || []).map(idOf));
    const previous = {
        status: fresh.status,
        dateKey: dateKey(fresh.date),
        sessionId: idOf(fresh.session),
        roomId: idOf(fresh.room),
        room: fresh.room ? await Room.findById(fresh.room).select("roomNumber building") : null,
        operationalState: fresh.operationalState || ""
    };

    fresh.date = date;
    fresh.session = snapshot.session.id;
    fresh.room = snapshot.room?.id || undefined;
    fresh.reportingTime = snapshot.reportingTime;
    fresh.duration = snapshot.duration;
    fresh.status = "scheduled";
    fresh.operationalState = snapshot.operationalChange || "";
    fresh.eligibleStudents = students;
    fresh.workflowLocked = true;
    fresh.publishedVersion = version.versionNumber;
    await fresh.save();

    if ((snapshot.instructions || "") !== "") {
        const examination = await Exam.findById(fresh.examination);
        if (examination && examination.instructions !== snapshot.instructions) {
            examination.instructions = snapshot.instructions;
            await examination.save();
        }
    }

    const archived = await ScheduleVersion.find({ schedule: fresh._id, state: "published" });
    if (archived.length) {
        await ScheduleVersion.updateMany(
            { schedule: fresh._id, state: "published" },
            { $set: { state: "archived", archivedAt: new Date() } }
        );
        for (const item of archived) {
            await logActivity({
                user: req.user.userId,
                action: "archived",
                entity: "Schedule",
                entityId: fresh._id,
                description: `Archived version ${item.versionNumber}`
            });
            await logActivity({
                user: req.user.userId,
                action: "superseded",
                entity: "Schedule",
                entityId: fresh._id,
                description: `Version ${item.versionNumber} superseded by version ${version.versionNumber}`
            });
        }
    }

    const populated = await Schedule.findById(fresh._id)
        .populate("examination", "title instructions")
        .populate("subject", "code name department")
        .populate("session", "name startTime endTime reportingTime")
        .populate("room", "roomNumber building");

    const limitations = await alignPublishedDependencies(previous, fresh, populated);
    const nextStudents = (populated.eligibleStudents || []).map(idOf);
    try {
        await notifyScheduleChange({
            previous,
            next: populated,
            students: nextStudents,
            newcomers: nextStudents.filter((studentId) => !previousStudents.has(studentId)),
            staying: nextStudents.filter((studentId) => previousStudents.has(studentId))
        });
        await notifyOperationalChange(fresh, nextStudents, snapshot, version.versionNumber, previous);
        await notifyDepartment(fresh, version.versionNumber, snapshot);
    } catch (error) {
        console.error("Schedule notification failed:", error.message);
    }

    try {
        await syncDutiesAfterScheduleChange(previous, populated);
    } catch (error) {
        console.error("Invigilation schedule sync failed:", error.message);
    }

    const baseline = await parentSnapshot(version);
    const impact = await collectImpact(fresh, snapshot, baseline);
    impact.limitations = [...new Set([...impact.limitations, ...limitations])];
    const changes = diffSnapshots(baseline, snapshot);

    version.state = "published";
    version.publishedAt = new Date();
    version.publishedBy = req.user.userId;
    version.changeSummary = changes.length ? summarize(changes) : (version.changeSummary || "Initial version");
    version.comparison = { changedFields: changes.map((change) => change.field) };
    version.affected = {
        students: impact.students,
        faculty: impact.faculty,
        departments: impact.departments
    };
    version.markModified("comparison");
    version.markModified("affected");
    await version.save();

    await remember(approval, {
        action: "published",
        actor: req.user.userId,
        fromStage: "ACADEMIC_APPROVAL",
        toStage: "PUBLISHED",
        status: "approved",
        version: version.versionNumber
    });

    return {
        message: `Version ${version.versionNumber} published`,
        version: version.versionNumber,
        locked: true,
        impact
    };
};

const workflowSummary = async (req) => {
    const scope = await departmentScope(req);
    const subjectIds = await ownedSubjectIds(scope);
    const scheduleQuery = {};
    if (subjectIds) scheduleQuery.subject = { $in: subjectIds };
    const scheduleIds = subjectIds ? await Schedule.find(scheduleQuery).distinct("_id") : null;
    const approvalQuery = scheduleIds ? { schedule: { $in: scheduleIds } } : {};
    const approvals = await ScheduleApproval.find(approvalQuery).select("stage status schedule");
    const count = (predicate) => approvals.filter(predicate).length;

    const versionQuery = scheduleIds ? { schedule: { $in: scheduleIds } } : {};
    const recent = await ScheduleVersion.find({
        ...versionQuery,
        $or: [{ versionNumber: { $gt: 1 } }, { state: { $in: ["published", "archived"] } }]
    }).sort({ updatedAt: -1 }).limit(8);

    const scheduleMap = new Map();
    const ids = [...new Set(recent.map((item) => String(item.schedule)))];
    const schedules = await Schedule.find({ _id: { $in: ids } })
        .populate("examination", "title")
        .populate({ path: "subject", select: "code name department", populate: { path: "department", select: "name" } });
    schedules.forEach((schedule) => scheduleMap.set(String(schedule._id), schedule));

    return {
        draft: count((item) => item.stage === "DRAFT"),
        examCellReview: count((item) => item.stage === "EXAM_CELL_REVIEW"),
        departmentVerification: count((item) => item.stage === "DEPARTMENT_VERIFICATION"),
        academicApproval: count((item) => item.stage === "ACADEMIC_APPROVAL" && ["pending", "returned"].includes(item.status)),
        awaitingPublish: count((item) => item.stage === "ACADEMIC_APPROVAL" && item.status === "approved"),
        published: count((item) => item.stage === "PUBLISHED"),
        verified: count((item) => ["ACADEMIC_APPROVAL", "PUBLISHED"].includes(item.stage)),
        returned: count((item) => item.status === "returned" || item.status === "rejected"),
        pending: count((item) => item.stage !== "PUBLISHED" && item.stage !== "DRAFT"),
        recentChanges: recent.map((version) => {
            const schedule = scheduleMap.get(String(version.schedule));
            return {
                scheduleId: version.schedule,
                versionNumber: version.versionNumber,
                state: version.state,
                changeReason: version.changeReason || "",
                changeSummary: version.changeSummary || "",
                createdAt: version.createdAt,
                publishedAt: version.publishedAt || null,
                examination: schedule?.examination?.title || "",
                subject: schedule?.subject?.code || schedule?.subject?.name || "",
                department: schedule?.subject?.department?.name || ""
            };
        })
    };
};

const getApproval = async (req) => {
    const schedule = await loadScheduleForActor(req);
    return presentApproval(schedule);
};

const listVersions = async (req) => {
    const schedule = await loadScheduleForActor(req);
    const versions = await ScheduleVersion.find({ schedule: schedule._id }).sort({ versionNumber: 1 });
    const users = await namesFor(versions.flatMap((version) => [version.createdBy, version.publishedBy]));
    const items = [];
    for (const version of versions) items.push(await presentVersion(version, users));
    return {
        locked: Boolean(schedule.workflowLocked),
        publishedVersion: schedule.publishedVersion || null,
        items
    };
};

const getVersion = async (req) => {
    const schedule = await loadScheduleForActor(req);
    const versionNumber = Number(req.params.version);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) fail(400, "Invalid version");
    const version = await ScheduleVersion.findOne({ schedule: schedule._id, versionNumber });
    if (!version) fail(404, "Version not found");
    const approval = await ScheduleApproval.findOne({ schedule: schedule._id });
    const users = await namesFor([
        version.createdBy,
        version.publishedBy,
        ...((approval?.history || []).map((entry) => entry.actor))
    ]);
    const presented = await presentVersion(version, users);
    const history = presentHistory(approval?.history || [], users);
    const audit = await ActivityLog.find({ entity: "Schedule", entityId: schedule._id })
        .sort({ createdAt: 1 })
        .populate("user", "name role");

    return {
        ...presented,
        approvalStage: approval?.stage || "DRAFT",
        approvalStatus: approval?.status || "pending",
        approvalHistory: history.filter((entry) => !entry.version || entry.version === versionNumber),
        audit: audit
            .filter((entry) => String(entry.description || "").includes(`version ${versionNumber}`) || (versionNumber === 1 && /version 1/.test(entry.description || "")))
            .map((entry) => ({
                action: entry.action,
                description: entry.description,
                at: entry.createdAt,
                actor: entry.user ? { name: entry.user.name, role: entry.user.role } : null
            })),
        affected: version.affected
    };
};

const compareVersions = async (req) => {
    const schedule = await loadScheduleForActor(req);
    const fromNumber = Number(req.query.from);
    const toNumber = Number(req.query.to);
    if (!Number.isInteger(fromNumber) || !Number.isInteger(toNumber)) fail(400, "Invalid version");
    const [from, to] = await Promise.all([
        ScheduleVersion.findOne({ schedule: schedule._id, versionNumber: fromNumber }),
        ScheduleVersion.findOne({ schedule: schedule._id, versionNumber: toNumber })
    ]);
    if (!from || !to) fail(404, "Version not found");
    return {
        from: { versionNumber: from.versionNumber, state: from.state },
        to: { versionNumber: to.versionNumber, state: to.state },
        changes: diffSnapshots(from.snapshot, to.snapshot)
    };
};

const submitReview = async (req) => {
    if (!isManager(req.user.role)) fail(403, "Access denied");
    const schedule = await loadScheduleForActor(req);
    if (schedule.workflowLocked && !(await currentDraft(schedule._id, (await ScheduleApproval.findOne({ schedule: schedule._id }))?.currentVersion))) {
        fail(409, LOCK_MESSAGE);
    }
    await ensureInitialVersion(schedule, req.user.userId);
    const approval = await ScheduleApproval.findOne({ schedule: schedule._id });
    const version = approval.currentVersion;

    if (approval.stage === "DRAFT" && ["pending", "rejected", "returned"].includes(approval.status)) {
        await remember(approval, {
            action: "submitted_for_review",
            actor: req.user.userId,
            fromStage: "DRAFT",
            toStage: "EXAM_CELL_REVIEW",
            status: "pending",
            version
        });
    } else if (approval.stage === "EXAM_CELL_REVIEW" && ["pending", "returned"].includes(approval.status)) {
        await remember(approval, {
            action: "submitted_for_review",
            actor: req.user.userId,
            fromStage: "EXAM_CELL_REVIEW",
            toStage: "DEPARTMENT_VERIFICATION",
            status: "pending",
            version
        });
    } else {
        fail(409, "This transition is not allowed from the current approval stage.");
    }

    return presentApproval(await Schedule.findById(schedule._id));
};

const verifyDepartment = async (req) => {
    if (req.user.role !== "department_admin") {
        fail(403, "Department verification is limited to the owning department admin.");
    }
    const schedule = await loadScheduleForActor(req);
    const approval = await ScheduleApproval.findOne({ schedule: schedule._id });
    if (!approval || approval.stage !== "DEPARTMENT_VERIFICATION" || !["pending", "returned"].includes(approval.status)) {
        fail(409, "This transition is not allowed from the current approval stage.");
    }
    await remember(approval, {
        action: "department_verified",
        actor: req.user.userId,
        fromStage: "DEPARTMENT_VERIFICATION",
        toStage: "ACADEMIC_APPROVAL",
        status: "pending",
        version: approval.currentVersion
    });
    return presentApproval(schedule);
};

const approveAcademic = async (req) => {
    if (!isAcademic(req.user.role)) fail(403, "Access denied");
    const schedule = await loadScheduleForActor(req);
    const approval = await ScheduleApproval.findOne({ schedule: schedule._id });
    if (!approval) fail(409, "Department verification is required before academic approval.");
    if (approval.stage === "PUBLISHED") {
        fail(409, "This schedule is already published. Create a new version to make changes.");
    }
    if (approval.stage !== "ACADEMIC_APPROVAL") {
        fail(409, "Department verification is required before academic approval.");
    }
    if (approval.status === "approved") fail(409, "This schedule is already approved.");
    if (!["pending", "returned"].includes(approval.status)) {
        fail(409, "This transition is not allowed from the current approval stage.");
    }
    await remember(approval, {
        action: "approved",
        actor: req.user.userId,
        fromStage: "ACADEMIC_APPROVAL",
        toStage: "ACADEMIC_APPROVAL",
        status: "approved",
        version: approval.currentVersion
    });
    return presentApproval(schedule);
};

const returnSchedule = async (req) => {
    const reason = String(req.body?.reason || "").trim();
    if (reason.length < 5) fail(400, "A reason is required.");
    const requested = req.body?.action === "reject" ? "reject" : req.body?.action === "return" ? "return" : "";
    if (!requested) fail(400, "Invalid change request");

    const schedule = await loadScheduleForActor(req);
    const approval = await ScheduleApproval.findOne({ schedule: schedule._id });
    if (!approval) fail(409, "This transition is not allowed from the current approval stage.");

    let toStage = "";
    let status = requested === "reject" ? "rejected" : "returned";

    if (approval.stage === "DEPARTMENT_VERIFICATION") {
        if (req.user.role !== "department_admin") {
            fail(403, "Department verification is limited to the owning department admin.");
        }
        toStage = requested === "reject" ? "DRAFT" : "EXAM_CELL_REVIEW";
    } else if (approval.stage === "ACADEMIC_APPROVAL") {
        if (!isAcademic(req.user.role)) fail(403, "Access denied");
        toStage = requested === "reject" ? "DRAFT" : "DEPARTMENT_VERIFICATION";
    } else if (approval.stage === "EXAM_CELL_REVIEW") {
        if (!isManager(req.user.role)) fail(403, "Access denied");
        toStage = "DRAFT";
    } else {
        fail(409, "This transition is not allowed from the current approval stage.");
    }

    await remember(approval, {
        action: requested === "reject" ? "rejected" : "returned",
        actor: req.user.userId,
        reason,
        fromStage: approval.stage,
        toStage,
        status,
        version: approval.currentVersion
    });
    return presentApproval(schedule);
};

const createNextVersion = async (req) => {
    if (!isManager(req.user.role)) fail(403, "Access denied");
    const reason = String(req.body?.changeReason || "").trim();
    if (reason.length < 5) fail(400, "A change reason is required.");

    const schedule = await loadScheduleForActor(req);
    const fresh = await Schedule.findById(schedule._id);
    if (!fresh.workflowLocked || !fresh.publishedVersion) {
        fail(409, "A new version can only be created from a published schedule.");
    }

    const existingDraft = await ScheduleVersion.findOne({ schedule: fresh._id, state: "draft" });
    if (existingDraft) fail(409, "A draft version already exists for this schedule.");

    const published = await ScheduleVersion.findOne({ schedule: fresh._id, state: "published" });
    if (!published) fail(409, "No published version is available to copy.");

    const latest = await ScheduleVersion.findOne({ schedule: fresh._id }).sort({ versionNumber: -1 });
    const versionNumber = (latest?.versionNumber || published.versionNumber) + 1;
    const snapshot = JSON.parse(JSON.stringify(published.snapshot));
    const version = await ScheduleVersion.create({
        schedule: fresh._id,
        versionNumber,
        state: "draft",
        snapshot,
        createdBy: req.user.userId,
        changeReason: reason,
        changeSummary: "",
        parentVersion: published.versionNumber
    });

    const approval = await ScheduleApproval.findOne({ schedule: fresh._id });
    await remember(approval, {
        action: "version_created",
        actor: req.user.userId,
        reason,
        fromStage: approval.stage,
        toStage: "DRAFT",
        status: "pending",
        version: versionNumber
    });

    return {
        message: `Version ${versionNumber} created`,
        versionNumber,
        state: version.state,
        changeReason: reason,
        parentVersion: published.versionNumber
    };
};

const updateVersion = async (req) => {
    if (!isManager(req.user.role)) fail(403, "Access denied");
    const schedule = await loadScheduleForActor(req);
    const versionNumber = Number(req.params.version);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) fail(400, "Invalid version");

    const fresh = await Schedule.findById(schedule._id);
    const version = await ScheduleVersion.findOne({ schedule: fresh._id, versionNumber });
    if (!version) fail(404, "Version not found");
    if (version.state !== "draft") fail(409, "This version is published and cannot be changed.");

    const approval = await ScheduleApproval.findOne({ schedule: fresh._id });
    if (!approval || approval.currentVersion !== versionNumber) {
        fail(409, "Invalid version");
    }

    const snapshot = await applyEdits(version.snapshot, req.body || {}, fresh);
    const changes = diffSnapshots(await parentSnapshot(version), snapshot);
    version.snapshot = snapshot;
    version.changeSummary = changes.length ? summarize(changes) : version.changeSummary;
    version.comparison = { changedFields: changes.map((change) => change.field) };
    version.markModified("snapshot");
    version.markModified("comparison");
    await version.save();
    await syncUnlockedDraft(fresh, snapshot);

    if (approval.stage !== "DRAFT") {
        await remember(approval, {
            action: "changed",
            actor: req.user.userId,
            fromStage: approval.stage,
            toStage: "DRAFT",
            status: "pending",
            version: versionNumber,
            reason: "Draft version changed before publication"
        });
    } else {
        await logActivity({
            user: req.user.userId,
            action: "changed",
            entity: "Schedule",
            entityId: fresh._id,
            description: `changed version ${versionNumber}`
        });
    }

    const users = await namesFor([version.createdBy]);
    return presentVersion(version, users);
};

const getImpact = async (req) => {
    const schedule = await loadScheduleForActor(req);
    const approval = await ScheduleApproval.findOne({ schedule: schedule._id });
    let snapshot = null;
    let baseline = null;

    if (approval) {
        const version = await ScheduleVersion.findOne({
            schedule: schedule._id,
            versionNumber: approval.currentVersion
        });
        snapshot = version?.snapshot || null;
        baseline = version ? await parentSnapshot(version) : null;
    }

    if (!snapshot) snapshot = await buildSnapshot(schedule._id);
    return collectImpact(schedule, snapshot, baseline);
};

module.exports = {
    LOCK_MESSAGE,
    STAGES,
    refreshDraftSnapshot,
    workflowSummary,
    getApproval,
    listVersions,
    getVersion,
    compareVersions,
    submitReview,
    verifyDepartment,
    approveAcademic,
    returnSchedule,
    createNextVersion,
    updateVersion,
    publishVersion,
    getImpact,
    diffSnapshots
};
