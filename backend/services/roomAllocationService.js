const Room = require("../models/Room");
const RoomAllocation = require("../models/RoomAllocation");
const Subject = require("../models/Subject");
const { detectConflicts } = require("./conflictDetectionService");

const roomLabel = (room) => `${room.building || ""} ${room.roomNumber || ""}`.trim();

const roomSortKey = (room) => `${room.building}\u0000${room.roomNumber}`;

const chooseRooms = (rooms, needed) => {
    const sorted = [...rooms].sort((left, right) => {
        return left.capacity - right.capacity || roomSortKey(left).localeCompare(roomSortKey(right));
    });
    const single = sorted.find((room) => room.capacity >= needed);

    if (single) return [single];

    const limited = sorted.slice(0, 16);
    let best = null;

    const consider = (chosen) => {
        const sum = chosen.reduce((total, room) => total + room.capacity, 0);
        if (sum < needed) return;
        const key = chosen.map(roomSortKey).join("|");

        if (
            !best
            || chosen.length < best.chosen.length
            || (chosen.length === best.chosen.length && (sum < best.sum || (sum === best.sum && key < best.key)))
        ) {
            best = { chosen: [...chosen], sum, key };
        }
    };

    const search = (start, chosen) => {
        const sum = chosen.reduce((total, room) => total + room.capacity, 0);
        if (sum >= needed) {
            consider(chosen);
            return;
        }
        if (best && chosen.length >= best.chosen.length) return;
        if (chosen.length >= 8) return;

        for (let index = start; index < limited.length; index += 1) {
            chosen.push(limited[index]);
            search(index + 1, chosen);
            chosen.pop();
        }
    };

    search(0, []);
    return best ? best.chosen : null;
};

const emptyPlan = (students, message) => ({
    ok: false,
    message,
    status: message,
    students,
    rooms: [],
    capacity: 0,
    allocated: 0,
    unused: 0,
    conflicts: []
});

const planRoomAllocation = async (schedule) => {
    const studentIds = schedule.eligibleStudents || [];
    const students = studentIds.length;

    if (!students) {
        return emptyPlan(0, "No eligible students found for this examination and subject.");
    }

    if (schedule.room) {
        return emptyPlan(students, "This schedule already has a manual room assignment.");
    }

    const existing = await RoomAllocation.countDocuments({ schedule: schedule._id });
    if (existing) {
        return emptyPlan(students, "Rooms are already allocated for this schedule.");
    }

    const subject = await Subject.findById(schedule.subject?._id || schedule.subject).select("department");
    const rooms = await Room.find({ status: "active" });
    const available = [];

    for (const room of rooms) {
        if (room.department && String(room.department) !== String(subject?.department || "")) {
            continue;
        }

        const result = await detectConflicts({
            examinationId: schedule.examination?._id || schedule.examination,
            subjectId: schedule.subject?._id || schedule.subject,
            date: schedule.date,
            sessionId: schedule.session?._id || schedule.session,
            roomId: room._id,
            eligibleStudentIds: studentIds,
            ignoreScheduleId: schedule._id,
            skipRoomCapacity: true
        });
        const blocked = (result.conflicts || []).some((conflict) => {
            return conflict.type === "room" && conflict.severity === "blocking";
        });

        if (!blocked) available.push(room);
    }

    const chosen = chooseRooms(available, students);

    if (!chosen) {
        return emptyPlan(
            students,
            `No combination of available rooms can accommodate ${students} students for the selected session.`
        );
    }

    let remaining = students;
    const allocations = chosen.map((room) => {
        const allocatedStudents = Math.min(room.capacity, remaining);
        remaining -= allocatedStudents;
        return {
            room: room._id,
            roomNumber: room.roomNumber,
            building: room.building,
            floor: room.floor,
            capacity: room.capacity,
            allocatedStudents,
            label: roomLabel(room)
        };
    });
    const capacity = allocations.reduce((total, room) => total + room.capacity, 0);

    return {
        ok: true,
        message: "Ready to allocate",
        status: "Ready to allocate",
        students,
        rooms: allocations,
        capacity,
        allocated: students - remaining,
        unused: capacity - (students - remaining),
        conflicts: []
    };
};

const saveRoomAllocation = async (schedule, userId) => {
    const plan = await planRoomAllocation(schedule);

    if (!plan.ok) {
        const error = new Error(plan.message);
        error.status = 409;
        error.plan = plan;
        throw error;
    }

    const items = [];

    for (const room of plan.rooms) {
        const item = await RoomAllocation.create({
            schedule: schedule._id,
            room: room.room,
            allocatedStudents: room.allocatedStudents,
            capacity: room.capacity,
            date: schedule.date,
            session: schedule.session?._id || schedule.session,
            createdBy: userId
        });
        items.push(item);
    }

    return { plan, items };
};

module.exports = {
    chooseRooms,
    planRoomAllocation,
    saveRoomAllocation
};
