const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        content: {
            type: String,
            required: true,
            trim: true
        },

        category: {
            type: String,
            enum: [
                "general",
                "exam",
                "result",
                "academic",
                "important"
            ],
            default: "general"
        },

        priority: {
            type: String,
            enum: [
                "low",
                "normal",
                "high"
            ],
            default: "normal"
        },

        targetAudience: {
            type: String,
            enum: [
                "all",
                "students",
                "admins"
            ],
            default: "students"
        },

        publishDate: {
            type: Date,
            default: Date.now
        },

        expiryDate: {
            type: Date,
            default: null
        },

        published: {
            type: Boolean,
            default: false
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
);

announcementSchema.index({
    published: 1,
    publishDate: -1
});

module.exports = mongoose.model(
    "Announcement",
    announcementSchema
);