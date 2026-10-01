const mongoose = require("mongoose");

const subjectRegistrationSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject",
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

        registrationStatus: {
            type: String,
            enum: ["pending", "registered", "dropped"],
            default: "registered"
        }
    },
    {
        timestamps: true
    }
);

subjectRegistrationSchema.index(
    { student: 1, subject: 1, academicYear: 1, semester: 1 },
    { unique: true }
);

module.exports = mongoose.model("SubjectRegistration", subjectRegistrationSchema);
