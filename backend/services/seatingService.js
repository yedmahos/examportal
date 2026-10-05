// Deterministic seating over confirmed rooms only.
// Rooms are Schedule.room plus RoomAllocation rows. Quotas use allocatedStudents
// when an allocation exists, otherwise the manual room capacity.
// Anti-copy round-robins sections (or departments when every student shares a
// section). It does not fail when perfect separation is impossible.
// Writes validate fully in memory, insert a draft, then publish. MongoMemoryServer
// in the test scripts is standalone, so a failed write deletes the draft and
// restores the previous published plan instead of using a transaction.
const Exam = require("../models/Exam");
const User = require("../models/User");
const Enrollment = require("../models/Enrollment");
const ExamEligibility = require("../models/ExamEligibility");
const Room = require("../models/Room");
const RoomAllocation = require("../models/RoomAllocation");
const SeatingPlan = require("../models/SeatingPlan");
const SeatAllocation = require("../models/SeatAllocation");

const STRATEGIES = ["ROLL_NUMBER", "RANDOM", "SECTION", "ALTERNATE", "ANTI_COPY"];
const COLUMNS = 5;

const fail = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const compareText = (left, right) => String(left || "").localeCompare(String(right || ""), undefined, {
    numeric: true,
    sensitivity: "base"
});

const compareStudents = (left, right) => {
    return compareText(left.studentId, right.studentId) || compareText(left._id, right._id);
};

const rowLabel = (index) => {
    let value = index;
    let label = "";

    do {
        label = String.fromCharCode(65 + (value % 26)) + label;
        value = Math.floor(value / 26) - 1;
    } while (value >= 0);

    return label;
};

const seatAt = (position) => {
    const rowIndex = Math.floor(position / COLUMNS);
    const column = (position % COLUMNS) + 1;
    const row = rowLabel(rowIndex);

    return {
        row,
        column,
        seatNumber: `${row}-${String(column).padStart(2, "0")}`
    };
};

const shuffle = (items) => {
    const copy = [...items];

    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(Math.random() * (index + 1));
        const current = copy[index];
        copy[index] = copy[swap];
        copy[swap] = current;
    }

    return copy;
};

const groupedOrder = (students, keyOf) => {
    const groups = new Map();

    students.forEach((student) => {
        const key = keyOf(student) || "Unassigned";
        const list = groups.get(key) || [];
        list.push(student);
        groups.set(key, list);
    });

    const keys = [...groups.keys()].sort(compareText);
    const ordered = [];

    keys.forEach((key) => {
        groups.get(key).sort(compareStudents).forEach((student) => ordered.push(student));
    });

    return { ordered, groupCount: keys.length };
};

const roundRobin = (students, keyOf) => {
    const groups = new Map();

    students.forEach((student) => {
        const key = keyOf(student) || "Unassigned";
        const list = groups.get(key) || [];
        list.push(student);
        groups.set(key, list);
    });

    const keys = [...groups.keys()].sort(compareText);
    keys.forEach((key) => groups.get(key).sort(compareStudents));
    const queues = keys.map((key) => [...groups.get(key)]);
    const ordered = [];

    while (ordered.length < students.length) {
        queues.forEach((queue) => {
            if (queue.length) ordered.push(queue.shift());
        });
    }

    return { ordered, groupCount: keys.length };
};

const alternateOrder = (students) => {
    const sorted = [...students].sort(compareStudents);
    const midpoint = Math.ceil(sorted.length / 2);
    const ordered = [];

    for (let index = 0; index < midpoint; index += 1) {
        ordered.push(sorted[index]);
        if (sorted[midpoint + index]) ordered.push(sorted[midpoint + index]);
    }

    return ordered;
};

const antiCopyKey = (students) => {
    const sections = new Set(students.map((student) => student.section).filter(Boolean));
    const departments = new Set(students.map((student) => student.department).filter(Boolean));

    if (sections.size > 1) {
        return {
            keyOf: (student) => student.section || "Unassigned",
            groupCountHint: sections.size
        };
    }

    if (departments.size > 1) {
        return {
            keyOf: (student) => student.department || "Unassigned",
            groupCountHint: departments.size
        };
    }

    return {
        keyOf: (student) => student.section || student.department || "Unassigned",
        groupCountHint: 1
    };
};

const orderStudents = (students, strategy) => {
    if (strategy === "ROLL_NUMBER") {
        return { ordered: [...students].sort(compareStudents), limitations: [], groupOf: () => "" };
    }

    if (strategy === "RANDOM") {
        return { ordered: shuffle(students), limitations: [], groupOf: () => "" };
    }

    if (strategy === "SECTION") {
        const grouped = groupedOrder(students, (student) => student.section || "Unassigned");
        return { ordered: grouped.ordered, limitations: [], groupOf: (student) => student.section || "Unassigned" };
    }

    if (strategy === "ALTERNATE") {
        return { ordered: alternateOrder(students), limitations: [], groupOf: () => "" };
    }

    const key = antiCopyKey(students);
    const mixed = roundRobin(students, key.keyOf);
    return {
        ordered: mixed.ordered,
        limitations: [],
        groupOf: key.keyOf,
        groupCount: mixed.groupCount
    };
};

const sameGroupAdjacent = (seats, groupOf) => {
    return seats.some((seat, index) => {
        const right = index % COLUMNS === COLUMNS - 1 ? null : seats[index + 1];
        const below = seats[index + COLUMNS];
        const group = groupOf(seat);

        if (!group) return false;
        if (right && groupOf(right) === group) return true;
        if (below && groupOf(below) === group) return true;
        return false;
    });
};

const assertStrategy = (strategy) => {
    if (!STRATEGIES.includes(strategy)) {
        throw fail(400, "Strategy must be one of ROLL_NUMBER, RANDOM, SECTION, ALTERNATE, ANTI_COPY.");
    }
};

const assertSchedule = (schedule) => {
    if (
        !schedule?.examination
        || !schedule.subject
        || !schedule.date
        || !schedule.session
        || !["draft", "scheduled"].includes(schedule.status)
    ) {
        throw fail(400, "Schedule is not valid.");
    }
};

const loadStudents = async (schedule) => {
    const ids = (schedule.eligibleStudents || []).map((id) => String(id));

    if (new Set(ids).size !== ids.length) {
        throw fail(400, "Duplicate student in the schedule snapshot.");
    }

    if (!ids.length) {
        throw fail(400, "No eligible students found for this examination and subject.");
    }

    const users = await User.find({ _id: { $in: ids } }).select("name studentId department");

    if (users.length !== ids.length) {
        throw fail(400, "Schedule data is inconsistent.");
    }

    const examinationId = schedule.examination._id || schedule.examination;
    const subjectId = schedule.subject._id || schedule.subject;
    const eligibleRows = await ExamEligibility.find({
        student: { $in: ids },
        examination: examinationId,
        subject: subjectId,
        eligibilityStatus: { $in: ["eligible", "registered"] }
    }).select("student");
    const eligible = new Set(eligibleRows.map((row) => String(row.student)));
    const kept = users.filter((user) => eligible.has(String(user._id)));

    if (!kept.length) {
        throw fail(400, "No eligible students found for this examination and subject.");
    }

    const exam = await Exam.findById(examinationId).select("semester academicYearRef");
    const enrollmentQuery = {
        student: { $in: kept.map((user) => user._id) },
        status: "active"
    };

    if (exam?.semester) enrollmentQuery.semester = exam.semester;
    if (exam?.academicYearRef) enrollmentQuery.academicYear = exam.academicYearRef;

    const enrollments = await Enrollment.find(enrollmentQuery).populate("section", "name");
    const enrollmentByStudent = new Map(enrollments.map((row) => [String(row.student), row]));

    return kept.map((user) => {
        const enrollment = enrollmentByStudent.get(String(user._id));

        return {
            _id: user._id,
            name: user.name,
            studentId: user.studentId || "",
            department: user.department || "",
            section: enrollment?.section?.name || ""
        };
    });
};

const loadRooms = async (schedule) => {
    const allocations = await RoomAllocation.find({ schedule: schedule._id }).populate("room");
    const byId = new Map();

    for (const allocation of allocations) {
        if (!allocation.room || !allocation.room.capacity) {
            throw fail(400, "Schedule data is inconsistent.");
        }

        const room = allocation.room;
        byId.set(String(room._id), {
            _id: room._id,
            roomNumber: room.roomNumber,
            building: room.building,
            floor: room.floor,
            capacity: room.capacity,
            quota: Math.min(room.capacity, allocation.allocatedStudents)
        });
    }

    if (schedule.room) {
        const roomId = String(schedule.room._id || schedule.room);

        if (!byId.has(roomId)) {
            const room = await Room.findById(schedule.room);

            if (!room || !room.capacity) {
                throw fail(400, "Schedule data is inconsistent.");
            }

            byId.set(roomId, {
                _id: room._id,
                roomNumber: room.roomNumber,
                building: room.building,
                floor: room.floor,
                capacity: room.capacity,
                quota: room.capacity
            });
        }
    }

    const rooms = [...byId.values()].sort((left, right) => {
        return compareText(left.building, right.building)
            || compareText(left.floor, right.floor)
            || compareText(left.roomNumber, right.roomNumber)
            || compareText(left._id, right._id);
    });

    if (!rooms.length) {
        throw fail(400, "No rooms are allocated for this schedule.");
    }

    return rooms;
};

const buildArrangement = async (schedule, strategy) => {
    assertStrategy(strategy);
    assertSchedule(schedule);

    const students = await loadStudents(schedule);
    const rooms = await loadRooms(schedule);
    const available = rooms.reduce((sum, room) => sum + room.quota, 0);

    if (available < students.length) {
        throw fail(
            400,
            `Room capacity is insufficient for ${students.length} students. Available seats: ${available}.`
        );
    }

    const orderedResult = orderStudents(students, strategy);
    const ordered = orderedResult.ordered;
    const groupOf = orderedResult.groupOf || (() => "");
    const assignments = [];
    let cursor = 0;

    rooms.forEach((room) => {
        const count = Math.min(room.quota, ordered.length - cursor);
        const roomSeats = [];

        for (let offset = 0; offset < count; offset += 1) {
            const student = ordered[cursor + offset];
            const position = seatAt(offset);
            roomSeats.push({
                student: student._id,
                room: room._id,
                row: position.row,
                column: position.column,
                seatNumber: position.seatNumber,
                sequence: cursor + offset + 1,
                name: student.name,
                rollNumber: student.studentId,
                section: student.section,
                department: student.department,
                roomNumber: room.roomNumber,
                building: room.building
            });
        }

        assignments.push(...roomSeats);
        cursor += count;
    });

    if (cursor !== ordered.length) {
        throw fail(400, `Room capacity is insufficient for ${ordered.length} students. Available seats: ${cursor}.`);
    }

    const seenStudents = new Set();
    const seenSeats = new Set();

    assignments.forEach((seat) => {
        const studentKey = String(seat.student);
        const seatKey = `${seat.room}:${seat.seatNumber}`;

        if (seenStudents.has(studentKey) || seenSeats.has(seatKey)) {
            throw fail(400, "Duplicate seat would be produced.");
        }

        seenStudents.add(studentKey);
        seenSeats.add(seatKey);
    });

    const limitations = [];

    if (strategy === "ANTI_COPY") {
        const separated = orderedResult.groupCount > 1;
        const crowded = rooms.some((room) => {
            const roomSeats = assignments.filter((seat) => String(seat.room) === String(room._id));
            return sameGroupAdjacent(roomSeats, (seat) => groupOf({
                section: seat.section,
                department: seat.department
            }));
        });

        if (!separated) {
            limitations.push("Anti-copy separation is limited because every seated student belongs to the same section.");
        } else if (crowded) {
            limitations.push("Some students from the same section remain adjacent because the student mix cannot be fully separated.");
        }
    }

    return { rooms, assignments, limitations, strategy };
};

const summarize = (rooms, assignments, strategy, limitations, extra = {}) => {
    const assignedByRoom = new Map();

    assignments.forEach((seat) => {
        const key = String(seat.room);
        assignedByRoom.set(key, (assignedByRoom.get(key) || 0) + 1);
    });

    return {
        ok: true,
        strategy,
        students: assignments.length,
        seatsAssigned: assignments.length,
        limitations,
        rooms: rooms.map((room) => ({
            id: room._id,
            room: room._id,
            label: `${room.building} ${room.roomNumber}`.trim(),
            building: room.building,
            roomNumber: room.roomNumber,
            floor: room.floor,
            capacity: room.capacity,
            quota: room.quota,
            assigned: assignedByRoom.get(String(room._id)) || 0
        })),
        rows: assignments
            .slice()
            .sort((left, right) => left.sequence - right.sequence)
            .map((seat) => ({
                id: `${seat.room}-${seat.seatNumber}`,
                student: seat.name,
                studentId: seat.student,
                rollNumber: seat.rollNumber,
                section: seat.section || "",
                room: seat.roomNumber,
                building: seat.building,
                roomId: seat.room,
                seat: seat.seatNumber,
                row: seat.row,
                column: seat.column,
                sequence: seat.sequence
            })),
        ...extra
    };
};

const previewSeating = async (schedule, strategy) => {
    const arrangement = await buildArrangement(schedule, strategy);
    const existing = await SeatingPlan.findOne({ schedule: schedule._id, status: "published" }).select("_id version");

    return summarize(arrangement.rooms, arrangement.assignments, strategy, arrangement.limitations, {
        existing: Boolean(existing),
        message: existing ? "Seating plan already exists." : "Ready to save",
        status: "preview"
    });
};

const saveSeating = async (schedule, strategy, userId, regenerate) => {
    const arrangement = await buildArrangement(schedule, strategy);
    const existing = await SeatingPlan.findOne({ schedule: schedule._id, status: "published" });

    if (existing && !regenerate) {
        throw fail(409, "Seating plan already exists.");
    }

    if (regenerate && !existing) {
        throw fail(404, "No seating plan exists to regenerate.");
    }

    const latest = await SeatingPlan.findOne({ schedule: schedule._id }).sort({ version: -1 }).select("version");
    const version = (latest?.version || 0) + 1;
    let plan = null;

    try {
        plan = await SeatingPlan.create({
            schedule: schedule._id,
            status: "draft",
            strategy,
            generatedAt: new Date(),
            generatedBy: userId,
            version,
            limitations: arrangement.limitations,
            studentCount: arrangement.assignments.length,
            roomCount: arrangement.rooms.filter((room) => {
                return arrangement.assignments.some((seat) => String(seat.room) === String(room._id));
            }).length
        });

        await SeatAllocation.insertMany(arrangement.assignments.map((seat) => ({
            seatingPlan: plan._id,
            schedule: schedule._id,
            student: seat.student,
            room: seat.room,
            seatNumber: seat.seatNumber,
            row: seat.row,
            column: seat.column,
            sequence: seat.sequence
        })));

        if (existing) {
            existing.status = "superseded";
            existing.supersededAt = new Date();
            await existing.save();
        }

        plan.status = "published";
        await plan.save();
    } catch (error) {
        if (plan) {
            await SeatAllocation.deleteMany({ seatingPlan: plan._id });
            await SeatingPlan.deleteOne({ _id: plan._id });
        }

        if (existing && existing.status !== "published") {
            existing.status = "published";
            existing.supersededAt = undefined;
            await existing.save();
        }

        throw error;
    }

    return summarize(arrangement.rooms, arrangement.assignments, strategy, arrangement.limitations, {
        existing: false,
        message: regenerate ? "Seating plan regenerated" : "Seating plan saved",
        status: "published",
        item: {
            _id: plan._id,
            version: plan.version,
            status: plan.status,
            strategy: plan.strategy,
            generatedAt: plan.generatedAt,
            limitations: plan.limitations
        }
    });
};

const sectionByStudent = async (schedule, studentIds) => {
    const examinationId = schedule.examination._id || schedule.examination;
    const exam = await Exam.findById(examinationId).select("semester academicYearRef");
    const enrollmentQuery = {
        student: { $in: studentIds },
        status: "active"
    };

    if (exam?.semester) enrollmentQuery.semester = exam.semester;
    if (exam?.academicYearRef) enrollmentQuery.academicYear = exam.academicYearRef;

    const enrollments = await Enrollment.find(enrollmentQuery).populate("section", "name");
    return new Map(enrollments.map((row) => [String(row.student), row.section?.name || ""]));
};

const presentStored = async (plan) => {
    await plan.populate("schedule");
    const schedule = plan.schedule;
    const seats = await SeatAllocation.find({ seatingPlan: plan._id })
        .sort({ sequence: 1 })
        .populate("student", "name studentId department")
        .populate("room", "roomNumber building floor capacity");
    const sections = await sectionByStudent(
        schedule,
        seats.map((seat) => seat.student?._id).filter(Boolean)
    );
    let rooms = [];

    try {
        rooms = await loadRooms(schedule);
    } catch (error) {
        rooms = [];
    }

    const assignments = seats.map((seat) => ({
        student: seat.student?._id,
        room: seat.room?._id,
        row: seat.row,
        column: seat.column,
        seatNumber: seat.seatNumber,
        sequence: seat.sequence,
        name: seat.student?.name || "",
        rollNumber: seat.student?.studentId || "",
        section: sections.get(String(seat.student?._id)) || "",
        roomNumber: seat.room?.roomNumber || "",
        building: seat.room?.building || ""
    }));

    if (!rooms.length) {
        const seen = new Map();
        seats.forEach((seat) => {
            if (!seat.room || seen.has(String(seat.room._id))) return;
            seen.set(String(seat.room._id), {
                _id: seat.room._id,
                roomNumber: seat.room.roomNumber,
                building: seat.room.building,
                floor: seat.room.floor,
                capacity: seat.room.capacity,
                quota: seat.room.capacity
            });
        });
        rooms = [...seen.values()];
    }

    return summarize(rooms, assignments, plan.strategy, plan.limitations || [], {
        existing: plan.status === "published",
        message: plan.status === "published" ? "Seating plan already exists." : plan.status,
        status: plan.status,
        item: {
            _id: plan._id,
            version: plan.version,
            status: plan.status,
            strategy: plan.strategy,
            generatedAt: plan.generatedAt,
            generatedBy: plan.generatedBy,
            limitations: plan.limitations || []
        }
    });
};

const publishedPlan = async (scheduleId) => {
    return SeatingPlan.findOne({ schedule: scheduleId, status: "published" });
};

module.exports = {
    STRATEGIES,
    previewSeating,
    saveSeating,
    presentStored,
    publishedPlan
};
