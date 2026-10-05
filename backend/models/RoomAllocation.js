const mongoose = require("mongoose");

const roomAllocationSchema = new mongoose.Schema(
    {
        schedule: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Schedule",
            required: true
        },

        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true
        },

        allocatedStudents: {
            type: Number,
            required: true,
            min: 1
        },

        capacity: {
            type: Number,
            required: true,
            min: 1
        },

        date: {
            type: Date,
            required: true
        },

        session: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ExamSession",
            required: true
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
);

roomAllocationSchema.index({ schedule: 1, room: 1 }, { unique: true });
roomAllocationSchema.index({ room: 1, date: 1, session: 1 });

module.exports = mongoose.model("RoomAllocation", roomAllocationSchema);
