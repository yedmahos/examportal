const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB connected");

        const adminEmail = "admin@example.com";

        const existingAdmin = await User.findOne({
            email: adminEmail
        });

        if (existingAdmin) {
            console.log("Admin already exists");
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(
            "AdminPassword123",
            12
        );

        const admin = await User.create({
            name: "Portal Admin",
            email: adminEmail,
            password: hashedPassword,
            role: "admin",
            status: "active"
        });

        console.log("Admin created successfully");
        console.log("Email:", admin.email);
        console.log("Role:", admin.role);

        process.exit(0);
    } catch (error) {
        console.error("Admin creation failed:");
        console.error(error.message);

        process.exit(1);
    }
};

createAdmin();