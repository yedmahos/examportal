const mongoose = require("mongoose");

const examSessionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        code: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            unique: true
        },

        reportingTime: {
            type: String,
            required: true,
            trim: true
        },

        startTime: {
            type: String,
            required: true,
            trim: true
        },

        endTime: {
            type: String,
            required: true,
            trim: true
        },

        duration: {
            type: Number,
            required: true,
            min: 1
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        },

        isCustom: {
            type: Boolean,
            default: false
        },

        availability: {
            daysOfWeek: {
                type: [Number],
                default: [0, 1, 2, 3, 4, 5, 6]
            }
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("ExamSession", examSessionSchema);
