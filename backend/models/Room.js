const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
    {
        roomNumber: {
            type: String,
            required: true,
            trim: true
        },

        building: {
            type: String,
            required: true,
            trim: true
        },

        floor: {
            type: String,
            required: true,
            trim: true
        },

        capacity: {
            type: Number,
            required: true,
            min: 1
        },

        roomType: {
            type: String,
            enum: ["classroom", "laboratory", "hall", "seminar", "other"],
            default: "classroom"
        },

        facilities: {
            type: [String],
            default: []
        },

        availability: {
            isAvailable: {
                type: Boolean,
                default: true
            },

            unavailableDates: {
                type: [Date],
                default: []
            },

            unavailableSessions: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "ExamSession"
                }
            ]
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        }
    },
    {
        timestamps: true
    }
);

roomSchema.index(
    { building: 1, roomNumber: 1 },
    { unique: true }
);

module.exports = mongoose.model("Room", roomSchema);
