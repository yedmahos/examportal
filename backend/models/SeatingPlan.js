const mongoose = require("mongoose");

const seatingPlanSchema = new mongoose.Schema(
    {
        schedule: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Schedule",
            required: true
        },

        status: {
            type: String,
            enum: ["draft", "published", "superseded"],
            default: "draft"
        },

        strategy: {
            type: String,
            enum: ["ROLL_NUMBER", "RANDOM", "SECTION", "ALTERNATE", "ANTI_COPY"],
            required: true
        },

        generatedAt: {
            type: Date,
            required: true
        },

        generatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        version: {
            type: Number,
            required: true,
            min: 1
        },

        supersededAt: {
            type: Date
        },

        limitations: {
            type: [String],
            default: []
        },

        studentCount: {
            type: Number,
            required: true,
            min: 0
        },

        roomCount: {
            type: Number,
            required: true,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

seatingPlanSchema.index({ schedule: 1, version: 1 }, { unique: true });
seatingPlanSchema.index(
    { schedule: 1 },
    { unique: true, partialFilterExpression: { status: "published" } }
);

module.exports = mongoose.model("SeatingPlan", seatingPlanSchema);
