const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        exam: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Exam",
            required: true
        },

        marksObtained: {
            type: Number,
            required: true,
            min: 0
        },

        maximumMarks: {
            type: Number,
            required: true,
            min: 1
        },

        percentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },

        grade: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: ["passed", "failed"],
            required: true
        },

        published: {
            type: Boolean,
            default: false
        },

        publishedAt: {
            type: Date,
            default: null
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

// One result per student per exam
resultSchema.index(
    {
        student: 1,
        exam: 1
    },
    {
        unique: true
    }
);

module.exports = mongoose.model("Result", resultSchema);