const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true,
            select: false
        },

        role: {
            type: String,
            enum: ["student", "admin"],
            default: "student"
        },

        studentId: {
            type: String,
            unique: true,
            sparse: true,
            trim: true
        },

        department: {
            type: String,
            trim: true
        },

        program: {
            type: String,
            trim: true
        },

        semester: {
            type: Number,
            min: 1,
            max: 12
        },

        academicYear: {
            type: String,
            trim: true
        },

        phone: {
            type: String,
            trim: true
        },

        profileImage: {
            type: String,
            default: ""
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

userSchema.index({
    role: 1,
    department: 1
});

module.exports = mongoose.model("User", userSchema);