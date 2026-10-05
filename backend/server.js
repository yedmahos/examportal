const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const parseOriginList = (value) => {
    return String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
};

const allowedOrigins = [
    ...parseOriginList(process.env.CORS_ORIGINS),
    ...parseOriginList(process.env.FRONTEND_URL)
];

const isLocalOrigin = (origin) => {
    return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

const isConfiguredFrontendOrigin = (origin) => {
    if (allowedOrigins.includes(origin)) {
        return true;
    }

    // Vercel production and preview hosts for this frontend.
    return /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin);
};

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
const academicYearRoutes = require("./routes/academicYearRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const programRoutes = require("./routes/programRoutes");
const batchRoutes = require("./routes/batchRoutes");
const sectionRoutes = require("./routes/sectionRoutes");
const examTypeRoutes = require("./routes/examTypeRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const eligibilityRoutes = require("./routes/eligibilityRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const conflictRoutes = require("./routes/conflictRoutes");
const roomRoutes = require("./routes/roomRoutes");
const roomAllocationRoutes = require("./routes/roomAllocationRoutes");
const seatingRoutes = require("./routes/seatingRoutes");
const { ensureCatalog } = require("./services/catalogSeed");

const app = express();

// Request middleware
app.use(cors({
    origin(origin, callback) {
        if (!origin || isLocalOrigin(origin) || isConfiguredFrontendOrigin(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Origin not allowed"));
    }
}));
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
app.use("/api/academic-years", academicYearRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/exam-types", examTypeRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/eligibility", eligibilityRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/conflicts", conflictRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/room-allocations", roomAllocationRoutes);
app.use("/api/seating-plans", seatingRoutes);

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
    .then(async () => {
        console.log(
            "MongoDB connected successfully"
        );

        await ensureCatalog();

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