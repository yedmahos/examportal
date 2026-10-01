const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema(
    {
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

        date: {
            type: Date,
            required: true
        },

        session: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ExamSession",
            required: true
        },

        duration: {
            type: Number,
            required: true,
            min: 1
        },

        reportingTime: {
            type: String,
            required: true,
            trim: true
        },

        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room"
        },

        status: {
            type: String,
            enum: ["draft", "scheduled"],
            default: "draft"
        },

        eligibleStudents: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],

        warnings: {
            type: [
                {
                    type: {
                        type: String
                    },
                    severity: String,
                    message: String
                }
            ],
            default: []
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

scheduleSchema.index({
    date: 1,
    session: 1
});

scheduleSchema.index({
    examination: 1,
    subject: 1
});

module.exports = mongoose.model("Schedule", scheduleSchema);
