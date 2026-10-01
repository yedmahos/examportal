const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        academicYear: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AcademicYear",
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

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        }
    },
    {
        timestamps: true
    }
);

batchSchema.index(
    { program: 1, academicYear: 1, name: 1, semester: 1 },
    { unique: true }
);

module.exports = mongoose.model("Batch", batchSchema);
