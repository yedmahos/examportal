const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        subject: {
            type: String,
            required: true,
            trim: true
        },

        examCode: {
            type: String,
            trim: true
        },

        room: {
            type: String,
            trim: true
        },

        department: {
            type: String,
            required: true,
            trim: true
        },

        program: {
            type: String,
            required: true,
            trim: true
        },

        semester: {
            type: Number,
            required: true,
            min: 1,
            max: 12
        },

        academicYear: {
            type: String,
            required: true,
            trim: true
        },

        examDate: {
            type: Date,
            required: true
        },

        startTime: {
            type: String,
            required: true
        },

        endTime: {
            type: String,
            required: true
        },

        venue: {
            type: String,
            required: true,
            trim: true
        },

        duration: {
            type: Number,
            required: true,
            min: 1
        },

        instructions: {
            type: String,
            default: ""
        },

        status: {
            type: String,
            enum: [
                "scheduled",
                "ongoing",
                "completed",
                "cancelled",
                "postponed"
            ],
            default: "scheduled"
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        isArchived: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

examSchema.index({
    department: 1,
    semester: 1,
    examDate: 1
});

module.exports = mongoose.model("Exam", examSchema);