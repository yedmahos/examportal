const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        program: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Program",
            required: true
        },

        batch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Batch",
            required: true
        },

        section: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Section",
            required: true
        },

        academicYear: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AcademicYear",
            required: true
        },

        semester: {
            type: Number,
            required: true,
            min: 1,
            max: 12
        },

        status: {
            type: String,
            enum: ["active", "inactive", "completed"],
            default: "active"
        }
    },
    {
        timestamps: true
    }
);

enrollmentSchema.index(
    { student: 1, academicYear: 1, semester: 1 },
    { unique: true }
);

module.exports = mongoose.model("Enrollment", enrollmentSchema);
