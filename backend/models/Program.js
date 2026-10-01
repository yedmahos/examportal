const mongoose = require("mongoose");

const programSchema = new mongoose.Schema(
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
            uppercase: true
        },

        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            required: true
        },

        duration: {
            type: Number,
            required: true,
            min: 1,
            max: 10
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

programSchema.index(
    { department: 1, code: 1 },
    { unique: true }
);

module.exports = mongoose.model("Program", programSchema);
