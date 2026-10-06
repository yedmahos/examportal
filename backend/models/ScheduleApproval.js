const mongoose = require("mongoose");

const STAGES = [
    "DRAFT",
    "EXAM_CELL_REVIEW",
    "DEPARTMENT_VERIFICATION",
    "ACADEMIC_APPROVAL",
    "PUBLISHED"
];

const historySchema = new mongoose.Schema(
    {
        stage: String,
        status: String,
        action: String,
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        at: {
            type: Date,
            default: Date.now
        },
        reason: {
            type: String,
            default: ""
        },
        fromStage: String,
        toStage: String,
        version: Number
    },
    { _id: false }
);

const scheduleApprovalSchema = new mongoose.Schema(
    {
        schedule: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Schedule",
            required: true,
            unique: true
        },

        stage: {
            type: String,
            enum: STAGES,
            default: "DRAFT"
        },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "returned"],
            default: "pending"
        },

        currentVersion: {
            type: Number,
            default: 1,
            min: 1
        },

        history: {
            type: [historySchema],
            default: []
        }
    },
    { timestamps: true }
);

scheduleApprovalSchema.index({ stage: 1, status: 1 });

module.exports = mongoose.model("ScheduleApproval", scheduleApprovalSchema);
module.exports.STAGES = STAGES;
