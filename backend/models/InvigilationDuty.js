const mongoose = require("mongoose");

const invigilationDutySchema = new mongoose.Schema(
    {
        schedule: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Schedule",
            required: true
        },

        examination: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Exam",
            required: true
        },

        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject",
            required: true
        },

        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true
        },

        session: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ExamSession",
            required: true
        },

        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department"
        },

        date: {
            type: Date,
            required: true
        },

        reportingTime: {
            type: String,
            trim: true,
            default: ""
        },

        startTime: {
            type: String,
            trim: true,
            default: ""
        },

        endTime: {
            type: String,
            trim: true,
            default: ""
        },

        status: {
            type: String,
            enum: ["assigned", "cancelled", "completed"],
            default: "assigned"
        },

        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        cancelledAt: Date,
        completedAt: Date
    },
    {
        timestamps: true
    }
);

invigilationDutySchema.index({ faculty: 1, date: 1, session: 1 });
invigilationDutySchema.index({ schedule: 1, room: 1, status: 1 });
invigilationDutySchema.index({ schedule: 1, faculty: 1 });
invigilationDutySchema.index({ room: 1, date: 1, session: 1 });
invigilationDutySchema.index(
    { faculty: 1, schedule: 1, room: 1 },
    {
        unique: true,
        partialFilterExpression: { status: "assigned" }
    }
);

module.exports = mongoose.model("InvigilationDuty", invigilationDutySchema);
