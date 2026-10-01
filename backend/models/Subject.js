const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            unique: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        subjectType: {
            type: String,
            enum: ["theory", "practical", "elective", "viva", "lab"],
            required: true
        },

        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            required: true
        },

        program: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Program",
            required: true
        },

        semester: {
            type: Number,
            required: true,
            min: 1,
            max: 12
        },

        duration: {
            type: Number,
            required: true,
            min: 1
        },

        credits: {
            type: Number,
            min: 0
        },

        description: {
            type: String,
            trim: true,
            default: ""
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        },

        verificationStatus: {
            type: String,
            enum: ["unverified", "verified"],
            default: "unverified"
        }
    },
    {
        timestamps: true
    }
);

subjectSchema.index({
    department: 1,
    program: 1,
    semester: 1
});

module.exports = mongoose.model("Subject", subjectSchema);
