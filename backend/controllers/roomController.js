const Room = require("../models/Room");
const Schedule = require("../models/Schedule");
const {
    escapeRegex,
    parsePagination,
    paginationMeta
} = require("../utils/query");
const {
    isObjectId,
    invalidId,
    handleError,
    parseDateOnly,
    dateKey
} = require("../utils/http");

const ROOM_TYPES = ["classroom", "laboratory", "hall", "seminar", "other"];

const createRoom = async (req, res) => {
    try {
        const roomNumber = String(req.body.roomNumber || "").trim();
        const building = String(req.body.building || "").trim();
        const floor = String(req.body.floor || "").trim();
        const capacity = Number(req.body.capacity);
        const roomType = req.body.roomType || "classroom";

        if (!roomNumber || !building || !floor || !Number.isFinite(capacity) || capacity < 1) {
            return res.status(400).json({
                message: "Room number, building, floor and capacity are required"
            });
        }

        if (!ROOM_TYPES.includes(roomType)) {
            return res.status(400).json({ message: "Invalid room type" });
        }

        const item = await Room.create({
            roomNumber,
            building,
            floor,
            capacity,
            roomType,
            facilities: Array.isArray(req.body.facilities)
                ? req.body.facilities.map((item) => String(item).trim()).filter(Boolean)
                : [],
            availability: {
                isAvailable: req.body.isAvailable !== false,
                unavailableDates: Array.isArray(req.body.unavailableDates)
                    ? req.body.unavailableDates.map(parseDateOnly).filter(Boolean)
                    : [],
                unavailableSessions: Array.isArray(req.body.unavailableSessions)
                    ? req.body.unavailableSessions.filter(isObjectId)
                    : []
            },
            status: req.body.status === "inactive" ? "inactive" : "active"
        });

        res.status(201).json({ message: "Room created", item });
    } catch (error) {
        return handleError(res, error, "Create room error:");
    }
};

const listRooms = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const query = {};

        if (req.query.status === "active" || req.query.status === "inactive") {
            query.status = req.query.status;
        }

        if (req.query.roomType && ROOM_TYPES.includes(req.query.roomType)) {
            query.roomType = req.query.roomType;
        }

        if (req.query.search) {
            const regex = new RegExp(escapeRegex(req.query.search), "i");
            query.$or = [{ roomNumber: regex }, { building: regex }];
        }

        const [items, total] = await Promise.all([
            Room.find(query).sort({ building: 1, roomNumber: 1 }).skip(skip).limit(limit),
            Room.countDocuments(query)
        ]);

        res.status(200).json({
            items,
            ...paginationMeta({ page, limit, total })
        });
    } catch (error) {
        return handleError(res, error, "List rooms error:");
    }
};

const getRoom = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "room id");

        const item = await Room.findById(req.params.id)
            .populate("availability.unavailableSessions", "name code startTime endTime");

        if (!item) return res.status(404).json({ message: "Room not found" });

        const allocations = await Schedule.find({
            room: item._id,
            status: { $in: ["draft", "scheduled"] }
        })
            .populate("examination", "title")
            .populate("subject", "code name")
            .populate("session", "name startTime endTime")
            .sort({ date: 1 });

        res.status(200).json({ item, allocations });
    } catch (error) {
        return handleError(res, error, "Get room error:");
    }
};

const updateRoom = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "room id");

        const current = await Room.findById(req.params.id);

        if (!current) return res.status(404).json({ message: "Room not found" });

        const updates = {};

        ["roomNumber", "building", "floor"].forEach((field) => {
            if (req.body[field] !== undefined) updates[field] = String(req.body[field]).trim();
        });

        if (req.body.capacity !== undefined) {
            const capacity = Number(req.body.capacity);
            if (!Number.isFinite(capacity) || capacity < 1) {
                return res.status(400).json({ message: "Capacity must be at least 1" });
            }
            updates.capacity = capacity;
        }

        if (req.body.roomType !== undefined) {
            if (!ROOM_TYPES.includes(req.body.roomType)) {
                return res.status(400).json({ message: "Invalid room type" });
            }
            updates.roomType = req.body.roomType;
        }

        if (req.body.facilities !== undefined) {
            if (!Array.isArray(req.body.facilities)) {
                return res.status(400).json({ message: "Facilities must be an array" });
            }
            updates.facilities = req.body.facilities.map((item) => String(item).trim()).filter(Boolean);
        }

        if (req.body.status !== undefined) {
            if (req.body.status !== "active" && req.body.status !== "inactive") {
                return res.status(400).json({ message: "Invalid status" });
            }
            updates.status = req.body.status;
        }

        const availability = current.availability?.toObject
            ? { ...current.availability.toObject() }
            : {
                isAvailable: true,
                unavailableDates: [],
                unavailableSessions: []
            };

        if (req.body.isAvailable !== undefined) {
            availability.isAvailable = req.body.isAvailable === true;
        }

        if (req.body.unavailableDates !== undefined) {
            if (!Array.isArray(req.body.unavailableDates)) {
                return res.status(400).json({ message: "unavailableDates must be an array" });
            }
            availability.unavailableDates = req.body.unavailableDates
                .map(parseDateOnly)
                .filter(Boolean);
        }

        if (req.body.unavailableSessions !== undefined) {
            if (!Array.isArray(req.body.unavailableSessions)) {
                return res.status(400).json({ message: "unavailableSessions must be an array" });
            }
            availability.unavailableSessions = req.body.unavailableSessions.filter(isObjectId);
        }

        updates.availability = availability;

        const item = await Room.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        res.status(200).json({ message: "Room updated", item });
    } catch (error) {
        return handleError(res, error, "Update room error:");
    }
};

const roomAvailability = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "room id");

        const date = parseDateOnly(req.query.date);

        if (!date) return res.status(400).json({ message: "A valid date is required" });

        const room = await Room.findById(req.params.id);

        if (!room) return res.status(404).json({ message: "Room not found" });

        const allocations = await Schedule.find({
            room: room._id,
            date,
            status: { $in: ["draft", "scheduled"] }
        }).populate("session", "name code startTime endTime");

        const blockedByDate = (room.availability?.unavailableDates || []).some(
            (item) => dateKey(item) === dateKey(date)
        );

        res.status(200).json({
            room: room._id,
            date: dateKey(date),
            active: room.status === "active",
            available: room.availability?.isAvailable !== false && !blockedByDate,
            allocations
        });
    } catch (error) {
        return handleError(res, error, "Room availability error:");
    }
};

module.exports = {
    createRoom,
    listRooms,
    getRoom,
    updateRoom,
    roomAvailability
};
