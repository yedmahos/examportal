const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const examRoutes = require("./routes/examRoutes");
const resultRoutes = require("./routes/resultRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const studentRoutes = require("./routes/studentRoutes");
const profileRoutes = require("./routes/profileRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const activityRoutes = require("./routes/activityRoutes");

const ActivityLog = require("./models/ActivityLog");

const app = express();

// Request middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API health check
app.get("/", (req, res) => {
    res.status(200).json({
        message: "Exam Management Portal API is running"
    });
});

// API route handlers
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Activity routes
app.use("/api/activities", activityRoutes);

// Activity test route
app.get("/api/activity-test", async (req, res) => {
    try {
        const activities = await ActivityLog.find()
            .populate("user", "name email role")
            .sort({ createdAt: -1 })
            .limit(20);

        res.status(200).json({
            count: activities.length,
            activities
        });
    } catch (error) {
        console.error(
            "Activity test error:",
            error.message
        );

        res.status(500).json({
            message: "Activity test failed"
        });
    }
});

// Unknown route handler
app.use((req, res) => {
    res.status(404).json({
        message: "API route not found"
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error(
        "Server error:",
        error.message
    );

    res.status(500).json({
        message: "Internal server error"
    });
});

const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log(
            "MongoDB connected successfully"
        );

        app.listen(
            PORT,
            "0.0.0.0",
            () => {
                console.log(
                    `Server running on port ${PORT}`
                );
            }
        );
    })
    .catch((error) => {
        console.error(
            "MongoDB connection failed:"
        );

        console.error(error.message);

        process.exit(1);
    });