const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        action: {
            type: String,
            required: true,
            trim: true
        },

        entity: {
            type: String,
            required: true,
            trim: true
        },

        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        ipAddress: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

activityLogSchema.index({
    createdAt: -1
});

activityLogSchema.index({
    user: 1,
    createdAt: -1
});

module.exports = mongoose.model(
    "ActivityLog",
    activityLogSchema
);