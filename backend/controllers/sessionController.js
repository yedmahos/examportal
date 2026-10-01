const ExamSession = require("../models/ExamSession");
const {
    escapeRegex,
    parsePagination,
    paginationMeta
} = require("../utils/query");
const {
    isObjectId,
    invalidId,
    handleError,
    isTime,
    minutesFromTime
} = require("../utils/http");

const durationFromTimes = (startTime, endTime) => {
    const start = minutesFromTime(startTime);
    const end = minutesFromTime(endTime);

    if (start === null || end === null || end <= start) {
        return null;
    }

    return end - start;
};

const createSession = async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const code = String(req.body.code || "").trim().toUpperCase();
        const reportingTime = String(req.body.reportingTime || "").trim();
        const startTime = String(req.body.startTime || "").trim();
        const endTime = String(req.body.endTime || "").trim();

        if (!name || !code || !isTime(reportingTime) || !isTime(startTime) || !isTime(endTime)) {
            return res.status(400).json({
                message: "Name, code and valid reporting, start and end times are required"
            });
        }

        const duration = req.body.duration
            ? Number(req.body.duration)
            : durationFromTimes(startTime, endTime);

        if (!Number.isFinite(duration) || duration < 1) {
            return res.status(400).json({
                message: "Duration must be a positive number of minutes and end after the start"
            });
        }

        const days = Array.isArray(req.body.daysOfWeek)
            ? req.body.daysOfWeek.map(Number).filter((day) => day >= 0 && day <= 6)
            : [0, 1, 2, 3, 4, 5, 6];

        const item = await ExamSession.create({
            name,
            code,
            reportingTime,
            startTime,
            endTime,
            duration,
            status: req.body.status === "inactive" ? "inactive" : "active",
            isCustom: true,
            availability: { daysOfWeek: days },
            createdBy: req.user.userId
        });

        res.status(201).json({ message: "Session created", item });
    } catch (error) {
        return handleError(res, error, "Create session error:");
    }
};

const listSessions = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const query = {};

        if (req.query.status === "active" || req.query.status === "inactive") {
            query.status = req.query.status;
        }

        if (req.query.search) {
            const regex = new RegExp(escapeRegex(req.query.search), "i");
            query.$or = [{ name: regex }, { code: regex }];
        }

        const [items, total] = await Promise.all([
            ExamSession.find(query).sort({ isCustom: 1, startTime: 1 }).skip(skip).limit(limit),
            ExamSession.countDocuments(query)
        ]);

        res.status(200).json({
            items,
            ...paginationMeta({ page, limit, total })
        });
    } catch (error) {
        return handleError(res, error, "List sessions error:");
    }
};

const updateSession = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "session id");

        const current = await ExamSession.findById(req.params.id);

        if (!current) return res.status(404).json({ message: "Session not found" });

        const updates = {};

        if (req.body.name !== undefined) updates.name = String(req.body.name).trim();

        if (req.body.code !== undefined) {
            if (!current.isCustom) {
                return res.status(400).json({ message: "Built-in session codes cannot be changed" });
            }
            updates.code = String(req.body.code).trim().toUpperCase();
        }

        ["reportingTime", "startTime", "endTime"].forEach((field) => {
            if (req.body[field] !== undefined) {
                if (!isTime(req.body[field])) {
                    updates[field] = null;
                } else {
                    updates[field] = String(req.body[field]).trim();
                }
            }
        });

        if (updates.reportingTime === null || updates.startTime === null || updates.endTime === null) {
            return res.status(400).json({ message: "Times must use HH:MM" });
        }

        if (req.body.duration !== undefined) {
            const duration = Number(req.body.duration);
            if (!Number.isFinite(duration) || duration < 1) {
                return res.status(400).json({ message: "Duration must be greater than 0" });
            }
            updates.duration = duration;
        }

        if (req.body.status !== undefined) {
            if (req.body.status !== "active" && req.body.status !== "inactive") {
                return res.status(400).json({ message: "Invalid status" });
            }
            updates.status = req.body.status;
        }

        if (req.body.daysOfWeek !== undefined) {
            if (!Array.isArray(req.body.daysOfWeek)) {
                return res.status(400).json({ message: "daysOfWeek must be an array" });
            }
            updates.availability = {
                daysOfWeek: req.body.daysOfWeek.map(Number).filter((day) => day >= 0 && day <= 6)
            };
        }

        const item = await ExamSession.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        res.status(200).json({ message: "Session updated", item });
    } catch (error) {
        return handleError(res, error, "Update session error:");
    }
};

module.exports = {
    createSession,
    listSessions,
    updateSession
};
