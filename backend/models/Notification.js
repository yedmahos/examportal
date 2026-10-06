const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        message: {
            type: String,
            required: true,
            trim: true
        },

        type: {
            type: String,
            enum: [
                "exam",
                "result",
                "announcement",
                "important",
                "system"
            ],
            default: "system"
        },

        referenceId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        eventKey: {
            type: String,
            trim: true
        },

        isRead: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

notificationSchema.index({
    recipient: 1,
    isRead: 1,
    createdAt: -1
});

notificationSchema.index(
    { recipient: 1, eventKey: 1 },
    {
        unique: true,
        partialFilterExpression: { eventKey: { $type: "string" } }
    }
);

module.exports = mongoose.model(
    "Notification",
    notificationSchema
);