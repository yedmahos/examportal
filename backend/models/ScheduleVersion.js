const mongoose = require("mongoose");

const scheduleVersionSchema = new mongoose.Schema(
    {
        schedule: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Schedule",
            required: true
        },

        versionNumber: {
            type: Number,
            required: true,
            min: 1
        },

        state: {
            type: String,
            enum: ["draft", "published", "archived"],
            default: "draft"
        },

        snapshot: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        publishedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        publishedAt: Date,
        archivedAt: Date,

        changeSummary: {
            type: String,
            default: ""
        },

        changeReason: {
            type: String,
            default: ""
        },

        parentVersion: {
            type: Number,
            default: null
        },

        comparison: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        affected: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        }
    },
    { timestamps: true }
);

scheduleVersionSchema.index({ schedule: 1, versionNumber: 1 }, { unique: true });
scheduleVersionSchema.index({ schedule: 1, state: 1 });

scheduleVersionSchema.pre("save", async function guardPublishedVersion() {
    if (this.isNew) return;

    const publishingDraft = this.isModified("state") && this.state === "published";
    if (publishingDraft) return;

    if (this.state === "published" || this.state === "archived") {
        const error = new Error("This version is published and cannot be changed.");
        error.status = 409;
        throw error;
    }
});

module.exports = mongoose.model("ScheduleVersion", scheduleVersionSchema);
