const Schedule = require("../models/Schedule");
const Subject = require("../models/Subject");
const RoomAllocation = require("../models/RoomAllocation");
const { planRoomAllocation, saveRoomAllocation } = require("../services/roomAllocationService");
const { cancelDutiesForRemovedRoom } = require("../services/invigilationService");
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

const previewAllocation = async (req, res) => {
    try {
        const schedule = await loadSchedule(req.body.schedule, req);
        const plan = await planRoomAllocation(schedule);
        res.status(200).json(plan);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        return handleError(res, error, "Preview room allocation error:");
    }
};

const createAllocation = async (req, res) => {
    try {
        const schedule = await loadSchedule(req.body.schedule, req);
        const saved = await saveRoomAllocation(schedule, req.user.userId);
        res.status(201).json({
            message: "Rooms allocated",
            ...saved.plan,
            items: saved.items
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({
                message: error.message,
                ...(error.plan || {})
            });
        }
        return handleError(res, error, "Create room allocation error:");
    }
};

const listScheduleAllocations = async (req, res) => {
    try {
        const schedule = await loadSchedule(req.params.scheduleId, req);
        const items = await RoomAllocation.find({ schedule: schedule._id })
            .populate("room", "roomNumber building floor capacity roomType")
            .populate("session", "name startTime endTime")
            .sort({ createdAt: 1 });

        res.status(200).json({ items });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        return handleError(res, error, "List room allocations error:");
    }
};

const deleteAllocation = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "allocation id");

        const existing = await RoomAllocation.findById(req.params.id);

        if (!existing) return res.status(404).json({ message: "Room allocation not found" });

        await loadSchedule(existing.schedule, req);
        try {
            await cancelDutiesForRemovedRoom(existing.schedule, existing.room);
        } catch (error) {
            console.error("Invigilation room sync failed:", error.message);
        }
        await existing.deleteOne();
        res.status(200).json({ message: "Room allocation removed" });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        return handleError(res, error, "Delete room allocation error:");
    }
};

module.exports = {
    previewAllocation,
    createAllocation,
    listScheduleAllocations,
    deleteAllocation
};
