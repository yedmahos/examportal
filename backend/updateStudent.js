const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");

const updateStudent = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected");

        const studentEmail = "student@example.com";
        const hashedPassword = await bcrypt.hash("student123", 12);

        let student = await User.findOne({ email: studentEmail });

        if (student) {
            student.name = "Student";
            student.password = hashedPassword;
            student.role = "student";
            student.studentId = "TEST003";
            student.department = "Computer Science Engineering";
            student.program = "B.Tech";
            student.semester = 7;
            student.academicYear = "2026-27";
            student.phone = "6666666666";
            student.status = "active";
            await student.save();
            console.log("Student user updated successfully in MongoDB!");
        } else {
            student = await User.create({
                name: "Student",
                email: studentEmail,
                password: hashedPassword,
                role: "student",
                studentId: "TEST003",
                department: "Computer Science Engineering",
                program: "B.Tech",
                semester: 7,
                academicYear: "2026-27",
                phone: "6666666666",
                status: "active"
            });
            console.log("Student user created successfully in MongoDB!");
        }

        console.log("Email:", student.email);
        console.log("Password set to: password123");
        process.exit(0);
    } catch (error) {
        console.error("Student update failed:", error.message);
        process.exit(1);
    }
};

updateStudent();
