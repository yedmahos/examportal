const Schedule = require("../models/Schedule");
const Room = require("../models/Room");
const RoomAllocation = require("../models/RoomAllocation");
const User = require("../models/User");
const Subject = require("../models/Subject");
const ExamSession = require("../models/ExamSession");
const InvigilationDuty = require("../models/InvigilationDuty");
const FacultyAvailability = require("../models/FacultyAvailability");
const { dateKey, rangesOverlap, parseDateOnly } = require("../utils/http");
const {
    notifyDutyAssigned,
    notifyDutyRoomChanged,
    notifyDutyRescheduled,
    notifyDutyCancelled
} = require("./notificationEvents");

const idOf = (value) => (value ? String(value._id || value) : "");

const fail = (status, message, extra = {}) => {
    const error = new Error(message);
    error.status = status;
    Object.assign(error, extra);
    throw error;
};

const blocking = (reasons) => reasons.filter((item) => item.severity === "blocking");

const overlapsDuty = (duty, schedule) => {
    if (dateKey(duty.date) !== dateKey(schedule.date)) return false;

    if (duty.startTime && duty.endTime && schedule.session?.startTime && schedule.session?.endTime) {
        return rangesOverlap(
            duty.startTime,
            duty.endTime,
            schedule.session.startTime,
            schedule.session.endTime
        );
    }

    return idOf(duty.session) === idOf(schedule.session);
};

const loadSchedule = async (scheduleId) => {
    const schedule = await Schedule.findById(scheduleId)
        .populate("examination", "title")
        .populate("subject", "name code department")
        .populate("session", "name code startTime endTime reportingTime")
        .populate("room", "roomNumber building floor capacity");

    if (!schedule) fail(404, "Schedule not found");
    if (!schedule.session?.startTime) fail(400, "Schedule session is missing");
    return schedule;
};

const roomsForSchedule = async (schedule) => {
    const rooms = [];
    const push = (room) => {
        if (!room?._id) return;
        if (rooms.some((item) => idOf(item) === idOf(room))) return;
        rooms.push(room);
    };

    if (schedule.room?.roomNumber) {
        push(schedule.room);
    } else if (schedule.room) {
        push(await Room.findById(schedule.room).select("roomNumber building floor capacity"));
    }

    const allocations = await RoomAllocation.find({ schedule: schedule._id }).populate(
        "room",
        "roomNumber building floor capacity"
    );
    allocations.forEach((row) => push(row.room));
    return rooms;
};

const roomOnSchedule = (rooms, roomId) => rooms.find((room) => idOf(room) === String(roomId));

const presentRoom = (room) => (room ? {
    _id: room._id,
    roomNumber: room.roomNumber,
    building: room.building || "",
    floor: room.floor || ""
} : null);

const presentDuty = (duty) => ({
    _id: duty._id,
    schedule: idOf(duty.schedule),
    status: duty.status,
    date: duty.date,
    reportingTime: duty.reportingTime || "",
    startTime: duty.startTime || "",
    endTime: duty.endTime || "",
    faculty: duty.faculty && duty.faculty.name ? {
        _id: duty.faculty._id,
        name: duty.faculty.name,
        department: duty.faculty.departmentRef
            ? { _id: duty.faculty.departmentRef._id, name: duty.faculty.departmentRef.name, code: duty.faculty.departmentRef.code }
            : null
    } : { _id: duty.faculty },
    room: presentRoom(duty.room),
    session: duty.session && duty.session.name ? {
        _id: duty.session._id,
        name: duty.session.name,
        startTime: duty.session.startTime,
        endTime: duty.session.endTime
    } : { _id: duty.session },
    examination: duty.examination && duty.examination.title
        ? { _id: duty.examination._id, title: duty.examination.title }
        : { _id: duty.examination },
    subject: duty.subject && duty.subject.name
        ? { _id: duty.subject._id, name: duty.subject.name, code: duty.subject.code || "" }
        : { _id: duty.subject },
    department: duty.department || null
});

const populateDuty = (query) => query
    .populate({
        path: "faculty",
        select: "name role status departmentRef",
        populate: { path: "departmentRef", select: "name code" }
    })
    .populate("room", "roomNumber building floor")
    .populate("session", "name startTime endTime")
    .populate("examination", "title")
    .populate("subject", "name code department");

const dutyCounts = async (facultyIds) => {
    const rows = await InvigilationDuty.aggregate([
        { $match: { faculty: { $in: facultyIds }, status: { $in: ["assigned", "completed"] } } },
        {
            $group: {
                _id: { faculty: "$faculty", status: "$status" },
                count: { $sum: 1 }
            }
        }
    ]);
    const map = new Map();
    rows.forEach((row) => {
        const key = String(row._id.faculty);
        const current = map.get(key) || { assigned: 0, completed: 0 };
        current[row._id.status] = row.count;
        map.set(key, current);
    });
    return map;
};

const upcomingCounts = async (facultyIds) => {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const rows = await InvigilationDuty.aggregate([
        {
            $match: {
                faculty: { $in: facultyIds },
                status: "assigned",
                date: { $gte: start }
            }
        },
        { $group: { _id: "$faculty", count: { $sum: 1 } } }
    ]);
    return new Map(rows.map((row) => [String(row._id), row.count]));
};

const evaluateFaculty = async ({ schedule, rooms, room, facultyId, ignoreDutyId, sameDepartmentOnly, reserved = [] }) => {
    const reasons = [];
    const faculty = await User.findById(facultyId)
        .select("name role status departmentRef")
        .populate("departmentRef", "name code");

    if (!faculty || faculty.role !== "faculty") {
        reasons.push({ severity: "blocking", code: "faculty", message: "Faculty member was not found." });
        return { faculty: null, reasons, dutyCount: 0 };
    }

    if (faculty.status !== "active") {
        reasons.push({ severity: "blocking", code: "inactive", message: "Inactive Faculty" });
    }

    if (!roomOnSchedule(rooms, room._id || room)) {
        reasons.push({ severity: "blocking", code: "room", message: "This room is not part of the schedule." });
    }

    const availability = await FacultyAvailability.findOne({
        faculty: faculty._id,
        date: schedule.date,
        session: idOf(schedule.session)
    });

    if (availability && availability.available === false) {
        const sessionName = schedule.session?.name || "this";
        reasons.push({
            severity: "blocking",
            code: "unavailable",
            message: availability.reason || `Unavailable for ${sessionName} Session`
        });
    }

    const duties = await InvigilationDuty.find({
        faculty: faculty._id,
        status: "assigned",
        ...(ignoreDutyId ? { _id: { $ne: ignoreDutyId } } : {})
    }).populate("room", "roomNumber");

    const considered = [
        ...duties,
        ...reserved.filter((item) => idOf(item.faculty) === idOf(faculty))
    ];

    considered.forEach((duty) => {
        if (idOf(duty.schedule) === idOf(schedule) && idOf(duty.room) === idOf(room)) {
            reasons.push({
                severity: "blocking",
                code: "duplicate",
                message: "This Faculty member is already assigned to this room."
            });
            return;
        }

        if (overlapsDuty(duty, schedule)) {
            const roomNumber = duty.room?.roomNumber || duty.roomNumber || "another room";
            const time = duty.startTime && duty.endTime ? `${duty.startTime} - ${duty.endTime}` : "";
            reasons.push({
                severity: "blocking",
                code: "overlap",
                message: time
                    ? `Overlapping duty: already assigned to ${roomNumber}, ${time}`
                    : `Overlapping duty: already assigned to ${roomNumber}`
            });
        }
    });

    const subjectDepartment = idOf(schedule.subject?.department);
    const facultyDepartment = idOf(faculty.departmentRef);
    if (subjectDepartment && facultyDepartment && subjectDepartment !== facultyDepartment) {
        reasons.push(sameDepartmentOnly
            ? {
                severity: "blocking",
                code: "department",
                message: "Department restriction: Faculty is outside the examination department."
            }
            : {
                severity: "warning",
                code: "department",
                message: "Faculty is from a different department."
            });
    }

    const counts = await dutyCounts([faculty._id]);
    const dutyCount = (counts.get(idOf(faculty))?.assigned || 0) + (counts.get(idOf(faculty))?.completed || 0);

    return { faculty, reasons, dutyCount };
};

const snapshotFromSchedule = (schedule, room, facultyId, userId) => ({
    schedule: schedule._id,
    examination: idOf(schedule.examination),
    subject: idOf(schedule.subject),
    faculty: facultyId,
    room: idOf(room),
    session: idOf(schedule.session),
    department: schedule.subject?.department || undefined,
    date: schedule.date,
    reportingTime: schedule.reportingTime || schedule.session?.reportingTime || "",
    startTime: schedule.session?.startTime || "",
    endTime: schedule.session?.endTime || "",
    status: "assigned",
    assignedBy: userId
});

const previewAssignment = async ({ scheduleId, roomId, facultyId, sameDepartmentOnly, ignoreDutyId }) => {
    const schedule = await loadSchedule(scheduleId);
    const rooms = await roomsForSchedule(schedule);
    const room = roomOnSchedule(rooms, roomId);
    if (!room) fail(400, "This room is not part of the schedule.");

    const result = await evaluateFaculty({
        schedule,
        rooms,
        room,
        facultyId,
        ignoreDutyId,
        sameDepartmentOnly: Boolean(sameDepartmentOnly)
    });

    return {
        ok: blocking(result.reasons).length === 0,
        reasons: result.reasons,
        faculty: result.faculty ? {
            _id: result.faculty._id,
            name: result.faculty.name,
            department: result.faculty.departmentRef
                ? { _id: result.faculty.departmentRef._id, name: result.faculty.departmentRef.name, code: result.faculty.departmentRef.code }
                : null
        } : null,
        dutyCount: result.dutyCount,
        room: presentRoom(room),
        date: schedule.date,
        session: {
            _id: schedule.session._id,
            name: schedule.session.name,
            startTime: schedule.session.startTime,
            endTime: schedule.session.endTime
        },
        reportingTime: schedule.reportingTime || ""
    };
};

const createAssignment = async ({ scheduleId, roomId, facultyId, userId, sameDepartmentOnly, reserved }) => {
    const schedule = await loadSchedule(scheduleId);
    const rooms = await roomsForSchedule(schedule);
    const room = roomOnSchedule(rooms, roomId);
    if (!room) fail(400, "This room is not part of the schedule.");

    const result = await evaluateFaculty({
        schedule,
        rooms,
        room,
        facultyId,
        sameDepartmentOnly: Boolean(sameDepartmentOnly),
        reserved
    });
    const blocked = blocking(result.reasons);
    if (blocked.length) {
        fail(409, blocked[0].message, { reasons: result.reasons });
    }

    const duty = await InvigilationDuty.create(snapshotFromSchedule(schedule, room, facultyId, userId));
    try {
        await notifyDutyAssigned(duty, schedule, room);
    } catch (error) {
        console.error("Duty notification failed:", error.message);
    }

    return { duty, reasons: result.reasons };
};

const createAssignments = async ({ scheduleId, assignments, userId, sameDepartmentOnly }) => {
    const schedule = await loadSchedule(scheduleId);
    const rooms = await roomsForSchedule(schedule);
    const reserved = [];
    const accepted = [];

    for (const assignment of assignments || []) {
        const room = roomOnSchedule(rooms, assignment.room);
        if (!room) fail(400, "This room is not part of the schedule.");
        const result = await evaluateFaculty({
            schedule,
            rooms,
            room,
            facultyId: assignment.faculty,
            sameDepartmentOnly: Boolean(sameDepartmentOnly),
            reserved
        });
        const blocked = blocking(result.reasons);
        if (blocked.length) fail(409, blocked[0].message, { reasons: result.reasons, room: room._id, faculty: assignment.faculty });
        accepted.push({ room, facultyId: assignment.faculty, reasons: result.reasons });
        reserved.push({
            faculty: assignment.faculty,
            schedule: schedule._id,
            room,
            roomNumber: room.roomNumber,
            date: schedule.date,
            session: schedule.session._id,
            startTime: schedule.session.startTime,
            endTime: schedule.session.endTime
        });
    }

    const created = [];
    try {
        for (const row of accepted) {
            const duty = await InvigilationDuty.create(
                snapshotFromSchedule(schedule, row.room, row.facultyId, userId)
            );
            created.push(duty);
            try {
                await notifyDutyAssigned(duty, schedule, row.room);
            } catch (error) {
                console.error("Duty notification failed:", error.message);
            }
        }
    } catch (error) {
        if (created.length) await InvigilationDuty.deleteMany({ _id: { $in: created.map((item) => item._id) } });
        throw error;
    }

    return created;
};

const generatePreview = async ({ scheduleId, sameDepartmentOnly }) => {
    const schedule = await loadSchedule(scheduleId);
    const rooms = await roomsForSchedule(schedule);
    const existing = await InvigilationDuty.find({ schedule: schedule._id, status: "assigned" }).select("room faculty");
    const takenRooms = new Set(existing.map((duty) => idOf(duty.room)));
    const openRooms = rooms.filter((room) => !takenRooms.has(idOf(room)));
    const faculty = await User.find({ role: "faculty", status: "active" })
        .select("name departmentRef")
        .populate("departmentRef", "name code")
        .sort({ name: 1 });
    const counts = await dutyCounts(faculty.map((item) => item._id));
    const subjectDepartment = idOf(schedule.subject?.department);
    const reserved = existing.map((duty) => ({
        faculty: duty.faculty,
        schedule: schedule._id,
        room: duty.room,
        date: schedule.date,
        session: schedule.session,
        startTime: schedule.session.startTime,
        endTime: schedule.session.endTime
    }));
    const localCounts = new Map(faculty.map((item) => {
        const count = counts.get(idOf(item));
        return [idOf(item), (count?.assigned || 0) + (count?.completed || 0)];
    }));
    const rows = [];

    for (const room of openRooms) {
        const ranked = [...faculty].sort((left, right) => {
            const countDiff = (localCounts.get(idOf(left)) || 0) - (localCounts.get(idOf(right)) || 0);
            if (countDiff !== 0) return countDiff;
            const leftSame = idOf(left.departmentRef) === subjectDepartment ? 0 : 1;
            const rightSame = idOf(right.departmentRef) === subjectDepartment ? 0 : 1;
            if (leftSame !== rightSame) return leftSame - rightSame;
            return left.name.localeCompare(right.name);
        });
        let chosen = null;

        for (const candidate of ranked) {
            const result = await evaluateFaculty({
                schedule,
                rooms,
                room,
                facultyId: candidate._id,
                sameDepartmentOnly: Boolean(sameDepartmentOnly),
                reserved
            });
            if (blocking(result.reasons).length) continue;
            chosen = { candidate, result };
            break;
        }

        if (!chosen) {
            rows.push({
                room: presentRoom(room),
                faculty: null,
                dutyCount: null,
                status: "Unassigned",
                reasons: [{ severity: "blocking", code: "none", message: "No available Faculty member can take this room." }]
            });
            continue;
        }

        rows.push({
            room: presentRoom(room),
            faculty: {
                _id: chosen.candidate._id,
                name: chosen.candidate.name,
                department: chosen.candidate.departmentRef
                    ? { _id: chosen.candidate.departmentRef._id, name: chosen.candidate.departmentRef.name, code: chosen.candidate.departmentRef.code }
                    : null
            },
            dutyCount: localCounts.get(idOf(chosen.candidate)) || 0,
            status: "Available",
            reasons: chosen.result.reasons
        });
        localCounts.set(idOf(chosen.candidate), (localCounts.get(idOf(chosen.candidate)) || 0) + 1);
        reserved.push({
            faculty: chosen.candidate._id,
            schedule: schedule._id,
            room,
            roomNumber: room.roomNumber,
            date: schedule.date,
            session: schedule.session,
            startTime: schedule.session.startTime,
            endTime: schedule.session.endTime
        });
    }

    return {
        schedule: schedule._id,
        rows
    };
};

const listScheduleBoard = async (scheduleId) => {
    const schedule = await loadSchedule(scheduleId);
    const rooms = await roomsForSchedule(schedule);
    const duties = await populateDuty(InvigilationDuty.find({ schedule: schedule._id }).sort({ createdAt: 1 }));
    const faculty = await User.find({ role: "faculty" })
        .select("name status departmentRef")
        .populate("departmentRef", "name code")
        .sort({ name: 1 });
    const counts = await dutyCounts(faculty.map((item) => item._id));
    const roomRows = [];

    for (const room of rooms) {
        const assignment = duties.find((duty) => duty.status === "assigned" && idOf(duty.room) === idOf(room)) || null;
        const candidates = [];
        for (const member of faculty) {
            const result = await evaluateFaculty({
                schedule,
                rooms,
                room,
                facultyId: member._id,
                ignoreDutyId: assignment?._id
            });
            candidates.push({
                _id: member._id,
                name: member.name,
                status: member.status,
                department: member.departmentRef
                    ? { _id: member.departmentRef._id, name: member.departmentRef.name, code: member.departmentRef.code }
                    : null,
                dutyCount: (counts.get(idOf(member))?.assigned || 0) + (counts.get(idOf(member))?.completed || 0),
                reasons: result.reasons,
                ok: blocking(result.reasons).length === 0
            });
        }
        roomRows.push({
            room: presentRoom(room),
            assignment: assignment ? presentDuty(assignment) : null,
            candidates
        });
    }

    return {
        schedule: {
            _id: schedule._id,
            status: schedule.status,
            date: schedule.date,
            reportingTime: schedule.reportingTime,
            examination: schedule.examination,
            subject: schedule.subject,
            session: schedule.session
        },
        rooms: roomRows,
        duties: duties.map(presentDuty)
    };
};

const listMine = async (facultyId) => {
    const duties = await populateDuty(
        InvigilationDuty.find({ faculty: facultyId }).sort({ date: 1, startTime: 1 })
    );
    return duties.map(presentDuty);
};

const listForFaculty = async (facultyId) => listMine(facultyId);

const workload = async (departmentId) => {
    const query = { role: "faculty" };
    if (departmentId) query.departmentRef = departmentId;
    const faculty = await User.find(query)
        .select("name status departmentRef")
        .populate("departmentRef", "name code")
        .sort({ name: 1 });
    const ids = faculty.map((item) => item._id);
    const counts = await dutyCounts(ids);
    const upcoming = await upcomingCounts(ids);
    const items = faculty.map((member) => {
        const count = counts.get(idOf(member)) || { assigned: 0, completed: 0 };
        return {
            faculty: {
                _id: member._id,
                name: member.name,
                status: member.status
            },
            department: member.departmentRef
                ? { _id: member.departmentRef._id, name: member.departmentRef.name, code: member.departmentRef.code }
                : null,
            assignedDuties: count.assigned,
            upcomingDuties: upcoming.get(idOf(member)) || 0,
            completedDuties: count.completed,
            dutyCount: count.assigned + count.completed
        };
    });
    items.sort((left, right) => left.dutyCount - right.dutyCount || left.faculty.name.localeCompare(right.faculty.name));
    return items;
};

const updateDuty = async (dutyId, body, userId) => {
    const duty = await InvigilationDuty.findById(dutyId);
    if (!duty || duty.status === "cancelled") fail(404, "Invigilation duty not found");

    if (body.status === "cancelled") return cancelDuty(dutyId, userId);

    const schedule = await loadSchedule(duty.schedule);
    const rooms = await roomsForSchedule(schedule);
    const nextRoomId = body.room || duty.room;
    const nextFacultyId = body.faculty || duty.faculty;
    const roomChanged = idOf(nextRoomId) !== idOf(duty.room);
    const facultyChanged = idOf(nextFacultyId) !== idOf(duty.faculty);

    if (body.session && idOf(body.session) !== idOf(schedule.session)) {
        fail(400, "Duty assignment must use the schedule session.");
    }

    if (roomChanged || facultyChanged) {
        const room = roomOnSchedule(rooms, nextRoomId);
        if (!room) fail(400, "This room is not part of the schedule.");
        const result = await evaluateFaculty({
            schedule,
            rooms,
            room,
            facultyId: nextFacultyId,
            ignoreDutyId: duty._id,
            sameDepartmentOnly: Boolean(body.sameDepartmentOnly)
        });
        const blocked = blocking(result.reasons);
        if (blocked.length) fail(409, blocked[0].message, { reasons: result.reasons });

        const previousRoom = await Room.findById(duty.room).select("roomNumber building");
        const previousFaculty = duty.faculty;
        duty.room = room._id;
        duty.faculty = nextFacultyId;
        duty.date = schedule.date;
        duty.session = schedule.session._id;
        duty.reportingTime = schedule.reportingTime || "";
        duty.startTime = schedule.session.startTime;
        duty.endTime = schedule.session.endTime;
        if (body.status === "completed") {
            duty.status = "completed";
            duty.completedAt = new Date();
        }
        await duty.save();

        try {
            if (facultyChanged) {
                duty.faculty = previousFaculty;
                await notifyDutyCancelled(duty, schedule, previousRoom);
                duty.faculty = nextFacultyId;
                await notifyDutyAssigned(duty, schedule, room);
            } else if (roomChanged) {
                await notifyDutyRoomChanged(duty, schedule, previousRoom, room);
            }
        } catch (error) {
            console.error("Duty notification failed:", error.message);
        }

        return populateDuty(InvigilationDuty.findById(duty._id));
    }

    if (body.status === "completed") {
        duty.status = "completed";
        duty.completedAt = new Date();
        await duty.save();
    }

    return populateDuty(InvigilationDuty.findById(duty._id));
};

const cancelDuty = async (dutyId) => {
    const duty = await populateDuty(InvigilationDuty.findById(dutyId));
    if (!duty || duty.status === "cancelled") fail(404, "Invigilation duty not found");
    const schedule = await loadSchedule(duty.schedule);
    duty.status = "cancelled";
    duty.cancelledAt = new Date();
    await duty.save();
    try {
        await notifyDutyCancelled(duty, schedule, duty.room);
    } catch (error) {
        console.error("Duty notification failed:", error.message);
    }
    return duty;
};

const upsertAvailability = async ({ facultyId, date, sessionId, available, reason, notes, userId }) => {
    const parsed = parseDateOnly(date);
    if (!parsed) fail(400, "Date must use YYYY-MM-DD");
    const session = await ExamSession.findById(sessionId);
    if (!session) fail(404, "Session not found");
    const faculty = await User.findOne({ _id: facultyId, role: "faculty" });
    if (!faculty) fail(404, "Faculty member was not found.");

    const record = await FacultyAvailability.findOneAndUpdate(
        { faculty: facultyId, date: parsed, session: sessionId },
        {
            faculty: facultyId,
            date: parsed,
            session: sessionId,
            available: Boolean(available),
            reason: reason ? String(reason).trim() : "",
            notes: notes ? String(notes).trim() : "",
            updatedBy: userId
        },
        { upsert: true, setDefaultsOnInsert: true, returnDocument: "after" }
    );

    return record;
};

const listAvailability = async ({ facultyId, date }) => {
    const query = {};
    if (facultyId) query.faculty = facultyId;
    if (date) {
        const parsed = parseDateOnly(date);
        if (!parsed) fail(400, "Date must use YYYY-MM-DD");
        query.date = parsed;
    }
    const [items, sessions] = await Promise.all([
        FacultyAvailability.find(query).sort({ date: 1 }).populate("session", "name startTime endTime"),
        ExamSession.find({ status: "active" }).select("name code startTime endTime reportingTime").sort({ startTime: 1 })
    ]);
    return { items, sessions };
};

const syncDutiesAfterScheduleChange = async (previous, scheduleDoc) => {
    const duties = await InvigilationDuty.find({ schedule: scheduleDoc._id, status: "assigned" });
    if (!duties.length) return;

    const schedule = await loadSchedule(scheduleDoc._id);
    const rooms = await roomsForSchedule(schedule);
    const roomIds = new Set(rooms.map((room) => idOf(room)));
    const becameScheduled = previous && previous.status !== "scheduled" && schedule.status === "scheduled";
    const dateChanged = previous && previous.dateKey !== dateKey(schedule.date);
    const sessionChanged = previous && previous.sessionId !== idOf(schedule.session);

    for (const duty of duties) {
        if (!roomIds.has(idOf(duty.room))) {
            const room = await Room.findById(duty.room).select("roomNumber building");
            duty.status = "cancelled";
            duty.cancelledAt = new Date();
            await duty.save();
            if (previous?.status === "scheduled") {
                try {
                    await notifyDutyCancelled(duty, { ...schedule.toObject(), status: "scheduled" }, room);
                } catch (error) {
                    console.error("Duty notification failed:", error.message);
                }
            }
            continue;
        }

        duty.date = schedule.date;
        duty.session = schedule.session._id;
        duty.reportingTime = schedule.reportingTime || "";
        duty.startTime = schedule.session.startTime || "";
        duty.endTime = schedule.session.endTime || "";
        duty.examination = idOf(schedule.examination);
        duty.subject = idOf(schedule.subject);
        await duty.save();

        try {
            if (schedule.status === "scheduled" && (dateChanged || sessionChanged)) {
                await notifyDutyRescheduled(duty, schedule);
            } else if (becameScheduled) {
                const room = rooms.find((item) => idOf(item) === idOf(duty.room));
                await notifyDutyAssigned(duty, schedule, room);
            }
        } catch (error) {
            console.error("Duty notification failed:", error.message);
        }
    }
};

const cancelDutiesForSchedule = async (schedule) => {
    const duties = await InvigilationDuty.find({ schedule: schedule._id, status: "assigned" }).populate("room", "roomNumber building");
    if (!duties.length) return;
    const populated = schedule.examination?.title ? schedule : await loadSchedule(schedule._id);

    for (const duty of duties) {
        duty.status = "cancelled";
        duty.cancelledAt = new Date();
        await duty.save();
        if (populated.status === "scheduled") {
            try {
                await notifyDutyCancelled(duty, populated, duty.room);
            } catch (error) {
                console.error("Duty notification failed:", error.message);
            }
        }
    }
};

const cancelDutiesForRemovedRoom = async (scheduleId, roomId) => {
    const schedule = await Schedule.findById(scheduleId).select("room status");
    if (!schedule) return;
    if (idOf(schedule.room) === String(roomId)) return;

    const duties = await InvigilationDuty.find({
        schedule: scheduleId,
        room: roomId,
        status: "assigned"
    }).populate("room", "roomNumber building");
    if (!duties.length) return;
    const populated = await loadSchedule(scheduleId);

    for (const duty of duties) {
        duty.status = "cancelled";
        duty.cancelledAt = new Date();
        await duty.save();
        if (populated.status === "scheduled") {
            try {
                await notifyDutyCancelled(duty, populated, duty.room);
            } catch (error) {
                console.error("Duty notification failed:", error.message);
            }
        }
    }
};

const subjectDepartmentId = async (scheduleId) => {
    const schedule = await Schedule.findById(scheduleId).select("subject");
    if (!schedule) return null;
    const subject = await Subject.findById(schedule.subject).select("department");
    return subject?.department || null;
};

module.exports = {
    previewAssignment,
    createAssignment,
    createAssignments,
    generatePreview,
    listScheduleBoard,
    listMine,
    listForFaculty,
    workload,
    updateDuty,
    cancelDuty,
    upsertAvailability,
    listAvailability,
    syncDutiesAfterScheduleChange,
    cancelDutiesForSchedule,
    cancelDutiesForRemovedRoom,
    subjectDepartmentId,
    presentDuty
};
