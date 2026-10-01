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
            trim: true
        },

        program: {
            type: String,
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
            trim: true
        },

        examDate: {
            type: Date
        },

        startTime: {
            type: String
        },

        endTime: {
            type: String
        },

        venue: {
            type: String,
            trim: true
        },

        duration: {
            type: Number,
            min: 1
        },

        examType: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ExamType"
        },

        startDate: {
            type: Date
        },

        endDate: {
            type: Date
        },

        reportingTime: {
            type: String,
            trim: true
        },

        sessions: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ExamSession"
            }
        ],

        eligibleBatches: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Batch"
            }
        ],

        departmentRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department"
        },

        programRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Program"
        },

        academicYearRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AcademicYear"
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