const mongoose = require("mongoose");

const seatAllocationSchema = new mongoose.Schema(
    {
        seatingPlan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SeatingPlan",
            required: true
        },

        schedule: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Schedule",
            required: true
        },

        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true
        },

        seatNumber: {
            type: String,
            required: true,
            trim: true
        },

        row: {
            type: String,
            required: true,
            trim: true
        },

        column: {
            type: Number,
            required: true,
            min: 1
        },

        sequence: {
            type: Number,
            required: true,
            min: 1
        }
    },
    {
        timestamps: { createdAt: true, updatedAt: false }
    }
);

seatAllocationSchema.index({ seatingPlan: 1, student: 1 }, { unique: true });
seatAllocationSchema.index({ seatingPlan: 1, room: 1, seatNumber: 1 }, { unique: true });
seatAllocationSchema.index({ schedule: 1, student: 1 });

module.exports = mongoose.model("SeatAllocation", seatAllocationSchema);
