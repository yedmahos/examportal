const mongoose = require("mongoose");

const isObjectId = (value) => {
    return mongoose.Types.ObjectId.isValid(value);
};

const invalidId = (res, label) => {
    return res.status(400).json({
        message: `Invalid ${label}`
    });
};

const handleError = (res, error, label) => {
    if (error?.status >= 400 && error.status < 500) {
        return res.status(error.status).json({
            message: error.message
        });
    }

    if (error?.code === 11000) {
        return res.status(409).json({
            message: "A record with these details already exists"
        });
    }

    if (error?.name === "ValidationError") {
        return res.status(400).json({
            message: error.message
        });
    }

    if (error?.name === "CastError") {
        return res.status(400).json({
            message: "Invalid identifier"
        });
    }

    console.error(label, error);

    return res.status(500).json({
        message: "Internal server error"
    });
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const isTime = (value) => TIME_PATTERN.test(String(value || ""));

const parseDateOnly = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    return Number.isNaN(date.getTime()) ? null : date;
};

const dateKey = (value) => {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toISOString().slice(0, 10);
};

const minutesFromTime = (value) => {
    if (!isTime(value)) {
        return null;
    }

    const [hours, minutes] = String(value).split(":").map(Number);
    return hours * 60 + minutes;
};

const rangesOverlap = (startA, endA, startB, endB) => {
    const a1 = minutesFromTime(startA);
    const a2 = minutesFromTime(endA);
    const b1 = minutesFromTime(startB);
    const b2 = minutesFromTime(endB);

    if (a1 === null || a2 === null || b1 === null || b2 === null) {
        return false;
    }

    return a1 < b2 && b1 < a2;
};

module.exports = {
    isObjectId,
    invalidId,
    handleError,
    isTime,
    parseDateOnly,
    dateKey,
    minutesFromTime,
    rangesOverlap
};
