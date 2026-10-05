const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");

const updateAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected");

        const adminEmail = "admin@example.com";
        const hashedPassword = await bcrypt.hash("admin123", 12);

        let admin = await User.findOne({ email: adminEmail });

        if (admin) {
            admin.name = "Portal Admin";
            admin.password = hashedPassword;
            if (!admin.role || admin.role === "admin") {
                admin.role = "admin";
            }
            admin.status = "active";
            await admin.save();
            console.log("Admin user updated successfully in MongoDB!");
            console.log("Role preserved:", admin.role);
            if (admin.role === "admin") {
                console.log("Legacy admin was not auto-mapped. Use roleMigrationCheck.js --apply --map with an explicit role.");
            }
        } else {
            admin = await User.create({
                name: "Portal Admin",
                email: adminEmail,
                password: hashedPassword,
                role: "admin",
                status: "active"
            });
            console.log("Admin user created successfully in MongoDB!");
        }

        console.log("Email:", admin.email);
        console.log("Role:", admin.role);
        process.exit(0);
    } catch (error) {
        console.error("Admin update failed:", error.message);
        process.exit(1);
    }
};

updateAdmin();
