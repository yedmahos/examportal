const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        batch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Batch",
            required: true
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

sectionSchema.index(
    { batch: 1, name: 1 },
    { unique: true }
);

module.exports = mongoose.model("Section", sectionSchema);
