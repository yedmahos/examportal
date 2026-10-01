const mongoose = require("mongoose");

const examTypeSchema = new mongoose.Schema(
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
            uppercase: true,
            unique: true
        },

        description: {
            type: String,
            trim: true,
            default: ""
        },

        isCustom: {
            type: Boolean,
            default: false
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("ExamType", examTypeSchema);
