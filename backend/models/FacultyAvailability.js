const mongoose = require("mongoose");

const facultyAvailabilitySchema = new mongoose.Schema(
    {
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
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

        available: {
            type: Boolean,
            required: true
        },

        reason: {
            type: String,
            trim: true,
            default: ""
        },

        notes: {
            type: String,
            trim: true,
            default: ""
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
);

facultyAvailabilitySchema.index(
    { faculty: 1, date: 1, session: 1 },
    { unique: true }
);

module.exports = mongoose.model("FacultyAvailability", facultyAvailabilitySchema);
