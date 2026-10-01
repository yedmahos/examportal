const mongoose = require("mongoose");

const examEligibilitySchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
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

        eligibilityStatus: {
            type: String,
            enum: ["eligible", "registered", "blocked"],
            required: true
        },

        attendanceStatus: {
            type: String,
            enum: ["sufficient", "short", "unknown"],
            default: "unknown"
        },

        academicStatus: {
            type: String,
            enum: ["clear", "detained", "unknown"],
            default: "unknown"
        },

        examRegistrationStatus: {
            type: String,
            enum: ["registered", "not_registered", "pending"],
            default: "not_registered"
        },

        backlogStatus: {
            type: String,
            enum: ["none", "backlog", "cleared"],
            default: "none"
        },

        reason: {
            type: String,
            trim: true,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

examEligibilitySchema.index(
    { student: 1, examination: 1, subject: 1 },
    { unique: true }
);

module.exports = mongoose.model("ExamEligibility", examEligibilitySchema);
