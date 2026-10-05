const Schedule = require("../models/Schedule");
const Subject = require("../models/Subject");
const Exam = require("../models/Exam");
const ExamSession = require("../models/ExamSession");
const SeatingPlan = require("../models/SeatingPlan");
const SeatAllocation = require("../models/SeatAllocation");
const ExamEligibility = require("../models/ExamEligibility");
const {
    previewSeating,
    saveSeating,
    presentStored,
    publishedPlan
} = require("../services/seatingService");
const { isObjectId, invalidId, handleError } = require("../utils/http");
const { departmentScope, assertDepartment } = require("../utils/departmentScope");

const loadSchedule = async (id, req) => {
    if (!isObjectId(id)) {
        const error = new Error("Invalid schedule id");
        error.status = 400;
        throw error;
    }

    const schedule = await Schedule.findById(id);

    if (!schedule) {
        const error = new Error("Schedule not found");
        error.status = 404;
        throw error;
    }

    const subject = await Subject.findById(schedule.subject).select("department");
    assertDepartment(await departmentScope(req), subject?.department);
    return schedule;
};

const loadPlan = async (id, req) => {
    if (!isObjectId(id)) {
        const error = new Error("Invalid seating plan id");
        error.status = 400;
        throw error;
    }

    const plan = await SeatingPlan.findById(id);

    if (!plan) {
        const error = new Error("Seating plan not found");
        error.status = 404;
        throw error;
    }

    await loadSchedule(plan.schedule, req);
    return plan;
};

const preview = async (req, res) => {
    try {
        const schedule = await loadSchedule(req.body.schedule, req);
        const result = await previewSeating(schedule, req.body.strategy);
        res.status(200).json(result);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        return handleError(res, error, "Preview seating plan error:");
    }
};

const createPlan = async (req, res) => {
    try {
        const schedule = await loadSchedule(req.body.schedule, req);
        const saved = await saveSeating(schedule, req.body.strategy, req.user.userId, false);
        res.status(201).json(saved);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        return handleError(res, error, "Create seating plan error:");
    }
};

const regeneratePlan = async (req, res) => {
    try {
        const schedule = await loadSchedule(req.body.schedule, req);
        const saved = await saveSeating(schedule, req.body.strategy, req.user.userId, true);
        res.status(201).json(saved);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        return handleError(res, error, "Regenerate seating plan error:");
    }
};

const getBySchedule = async (req, res) => {
    try {
        const schedule = await loadSchedule(req.params.scheduleId, req);
        const plan = await publishedPlan(schedule._id);

        if (!plan) return res.status(404).json({ message: "Seating plan not found" });

        res.status(200).json(await presentStored(plan));
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        return handleError(res, error, "Get seating plan error:");
    }
};

const getPlan = async (req, res) => {
    try {
        const plan = await loadPlan(req.params.id, req);
        res.status(200).json(await presentStored(plan));
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        return handleError(res, error, "Get seating plan error:");
    }
};

const getRoom = async (req, res) => {
    try {
        const plan = await loadPlan(req.params.id, req);

        if (!isObjectId(req.params.roomId)) return invalidId(res, "room id");

        const presented = await presentStored(plan);
        const room = (presented.rooms || []).find((item) => String(item.room) === String(req.params.roomId));

        if (!room) return res.status(404).json({ message: "Room is not part of this seating plan" });

        res.status(200).json({
            room,
            items: (presented.rows || [])
                .filter((row) => String(row.roomId) === String(req.params.roomId))
                .map((row) => ({
                    seat: row.seat,
                    student: row.student,
                    rollNumber: row.rollNumber,
                    section: row.section
                }))
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        return handleError(res, error, "Get room seating error:");
    }
};

const studentRetainsEligibility = async (schedule, studentId) => {
    const row = await ExamEligibility.findOne({
        student: studentId,
        examination: schedule.examination,
        subject: schedule.subject,
        eligibilityStatus: { $in: ["eligible", "registered"] }
    }).select("_id");

    return Boolean(row);
};

const presentStudentSeat = async (schedule, seat) => {
    const [exam, session] = await Promise.all([
        Exam.findById(schedule.examination).select("title instructions"),
        ExamSession.findById(schedule.session).select("name startTime endTime")
    ]);
    await seat.populate("room", "roomNumber building floor");
    const subject = await Subject.findById(schedule.subject).select("name code");

    return {
        examination: exam?.title || "",
        subject: subject?.name || "",
        subjectCode: subject?.code || "",
        date: schedule.date,
        session: session?.name || "",
        reportingTime: schedule.reportingTime,
        building: seat.room?.building || "",
        room: seat.room?.roomNumber || "",
        seatNumber: seat.seatNumber,
        instructions: exam?.instructions || ""
    };
};

const mySeat = async (req, res) => {
    try {
        if (req.query.schedule && !isObjectId(req.query.schedule)) {
            return invalidId(res, "schedule id");
        }

        const scheduleQuery = {
            eligibleStudents: req.user.userId,
            status: "scheduled"
        };

        if (req.query.schedule) scheduleQuery._id = req.query.schedule;

        const schedules = await Schedule.find(scheduleQuery);
        const visible = [];

        for (const schedule of schedules) {
            if (await studentRetainsEligibility(schedule, req.user.userId)) {
                visible.push(schedule);
            }
        }

        if (req.query.schedule && !visible.length) {
            const exists = await Schedule.findById(req.query.schedule).select("_id");
            if (!exists) return res.status(404).json({ message: "Schedule not found" });
            return res.status(403).json({ message: "Access denied" });
        }

        const items = [];

        for (const schedule of visible) {
            const plan = await publishedPlan(schedule._id);
            if (!plan) continue;
            const seat = await SeatAllocation.findOne({
                seatingPlan: plan._id,
                student: req.user.userId
            });
            if (!seat) continue;
            items.push(await presentStudentSeat(schedule, seat));
        }

        if (req.query.schedule) {
            if (!items.length) {
                return res.status(404).json({ message: "Seat allocation has not been published yet." });
            }

            return res.status(200).json({ item: items[0] });
        }

        res.status(200).json({ items });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        return handleError(res, error, "Student seating error:");
    }
};

const deletePlan = async (req, res) => {
    try {
        const plan = await loadPlan(req.params.id, req);
        await SeatAllocation.deleteMany({ seatingPlan: plan._id });
        await plan.deleteOne();
        res.status(200).json({ message: "Seating plan removed" });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        return handleError(res, error, "Delete seating plan error:");
    }
};

module.exports = {
    preview,
    createPlan,
    regeneratePlan,
    getBySchedule,
    getPlan,
    getRoom,
    mySeat,
    deletePlan
};
