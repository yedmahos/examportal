const Schedule = require("../models/Schedule");
const Room = require("../models/Room");
const Enrollment = require("../models/Enrollment");
const Subject = require("../models/Subject");
const ExamSession = require("../models/ExamSession");
const {
    isObjectId,
    dateKey,
    rangesOverlap
} = require("../utils/http");

const ACTIVE_SCHEDULE = ["draft", "scheduled"];

const sameDay = (left, right) => dateKey(left) === dateKey(right);

const sessionsOverlap = (left, right) => {
    if (!left || !right) {
        return false;
    }

    if (String(left._id || left) === String(right._id || right)) {
        return true;
    }

    return rangesOverlap(
        left.startTime,
        left.endTime,
        right.startTime,
        right.endTime
    );
};

const roomUnavailableOnDate = (room, date) => {
    return (room.availability?.unavailableDates || []).some((item) => sameDay(item, date));
};

const detectConflicts = async ({
    examinationId,
    subjectId,
    date,
    sessionId,
    roomId,
    eligibleStudentIds = [],
    ignoreScheduleId
}) => {
    const conflicts = [];
    const subject = isObjectId(subjectId)
        ? await Subject.findById(subjectId).select("name subjectType")
        : null;
    const session = isObjectId(sessionId)
        ? await ExamSession.findById(sessionId)
        : null;

    if (!session) {
        conflicts.push({
            type: "session",
            severity: "blocking",
            message: "Session was not found"
        });
    } else if (session.status !== "active") {
        conflicts.push({
            type: "session",
            severity: "blocking",
            message: "Session is not active"
        });
    } else if (date) {
        const day = date.getUTCDay();
        const allowed = session.availability?.daysOfWeek || [];

        if (allowed.length && !allowed.includes(day)) {
            conflicts.push({
                type: "session",
                severity: "blocking",
                message: "Session is not available on the selected date"
            });
        }
    }

    const duplicateQuery = {
        examination: examinationId,
        subject: subjectId,
        status: { $in: ACTIVE_SCHEDULE }
    };

    if (ignoreScheduleId) {
        duplicateQuery._id = { $ne: ignoreScheduleId };
    }

    const duplicate = await Schedule.findOne(duplicateQuery).select("_id");

    if (duplicate) {
        conflicts.push({
            type: "duplicate_subject",
            severity: "blocking",
            message: "This subject is already scheduled for the examination"
        });
    }

    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const dayQuery = {
        date: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ACTIVE_SCHEDULE }
    };

    if (ignoreScheduleId) {
        dayQuery._id = { $ne: ignoreScheduleId };
    }

    const daySchedules = await Schedule.find(dayQuery)
        .populate("session", "name startTime endTime")
        .populate("subject", "name subjectType");

    const eligibleSet = new Set(eligibleStudentIds.map((id) => String(id)));

    const overlapping = daySchedules.filter((schedule) => {
        return sessionsOverlap(session, schedule.session);
    });

    const studentOverlap = overlapping.filter((schedule) => {
        return (schedule.eligibleStudents || []).some((studentId) => {
            return eligibleSet.has(String(studentId));
        });
    });

    if (studentOverlap.length) {
        conflicts.push({
            type: "student",
            severity: "blocking",
            message: "Student has overlapping examinations"
        });
    }

    if (eligibleStudentIds.length) {
        const ownEnrollments = await Enrollment.find({
            student: { $in: eligibleStudentIds },
            status: "active"
        }).select("batch student");

        const ownBatches = new Set(
            ownEnrollments.map((enrollment) => String(enrollment.batch))
        );

        const otherStudentIds = overlapping.flatMap(
            (schedule) => schedule.eligibleStudents || []
        );

        if (ownBatches.size && otherStudentIds.length) {
            const otherEnrollments = await Enrollment.find({
                student: { $in: otherStudentIds },
                status: "active",
                batch: { $in: [...ownBatches] }
            }).select("batch");

            if (otherEnrollments.length) {
                conflicts.push({
                    type: "batch",
                    severity: "blocking",
                    message: "Batch has an overlapping examination in this session"
                });
            }
        }

        const densityByStudent = new Map();

        for (const studentId of eligibleSet) {
            const existing = daySchedules.filter((schedule) => {
                return (schedule.eligibleStudents || []).some(
                    (id) => String(id) === studentId
                );
            }).length;

            densityByStudent.set(studentId, existing + 1);
        }

        const crowded = [...densityByStudent.values()].filter((count) => count >= 3);

        if (crowded.length) {
            conflicts.push({
                type: "density",
                severity: "warning",
                message: "Excessive exam density: a student already has multiple examinations on this date"
            });
        }
    }

    if (subject?.subjectType === "elective") {
        const electiveOverlap = overlapping.filter((schedule) => {
            const otherType = schedule.subject?.subjectType;
            const sharesStudent = (schedule.eligibleStudents || []).some((studentId) => {
                return eligibleSet.has(String(studentId));
            });

            return otherType === "elective" && sharesStudent;
        });

        if (electiveOverlap.length) {
            conflicts.push({
                type: "elective",
                severity: "blocking",
                message: "Elective examination overlaps another elective for the same students"
            });
        }
    }

    if (roomId) {
        if (!isObjectId(roomId)) {
            conflicts.push({
                type: "room",
                severity: "blocking",
                message: "Room identifier is invalid"
            });
        } else {
            const room = await Room.findById(roomId);

            if (!room) {
                conflicts.push({
                    type: "room",
                    severity: "blocking",
                    message: "Room does not exist"
                });
            } else if (room.status !== "active") {
                conflicts.push({
                    type: "room",
                    severity: "blocking",
                    message: "Room is not active"
                });
            } else if (room.availability?.isAvailable === false) {
                conflicts.push({
                    type: "room",
                    severity: "blocking",
                    message: "Room is not available"
                });
            } else if (roomUnavailableOnDate(room, date)) {
                conflicts.push({
                    type: "room",
                    severity: "blocking",
                    message: "Room is not available on the selected date"
                });
            } else if (
                (room.availability?.unavailableSessions || []).some(
                    (id) => String(id) === String(sessionId)
                )
            ) {
                conflicts.push({
                    type: "room",
                    severity: "blocking",
                    message: "Room is not available for the selected session"
                });
            } else {
                const allocation = overlapping.find((schedule) => {
                    return schedule.room && String(schedule.room) === String(roomId);
                });

                if (allocation) {
                    conflicts.push({
                        type: "room",
                        severity: "blocking",
                        message: "Room is already allocated to another overlapping schedule"
                    });
                }

                if (room.capacity < eligibleStudentIds.length) {
                    conflicts.push({
                        type: "room",
                        severity: "blocking",
                        message: "Room capacity is insufficient for the eligible students"
                    });
                }
            }
        }
    }

    return {
        hasConflict: conflicts.length > 0,
        conflicts
    };
};

const hasBlockingConflict = (result) => {
    return (result?.conflicts || []).some((conflict) => conflict.severity === "blocking");
};

module.exports = {
    detectConflicts,
    hasBlockingConflict
};
