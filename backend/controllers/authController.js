const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const parseSemester = (value) => {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return null;
    }

    if (typeof value === "number") {
        return value;
    }

    const match = String(value).match(/\d+/);

    return match ? Number(match[0]) : null;
};

const registerUser = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            studentId,
            department,
            program,
            semester,
            academicYear,
            phone
        } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message:
                    "Name, email and password are required"
            });
        }

        const normalizedEmail =
            email.trim().toLowerCase();

        const normalizedSemester =
            parseSemester(semester);

        if (normalizedSemester !== null) {
            if (
                normalizedSemester < 1 ||
                normalizedSemester > 12
            ) {
                return res.status(400).json({
                    message:
                        "Semester must be between 1 and 12"
                });
            }
        }

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message:
                    "User with this email already exists"
            });
        }

        if (studentId) {
            const existingStudent =
                await User.findOne({
                    studentId: studentId.trim()
                });

            if (existingStudent) {
                return res.status(409).json({
                    message:
                        "Student ID already exists"
                });
            }
        }

        const hashedPassword =
            await bcrypt.hash(password, 12);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "student",
            studentId: studentId
                ? studentId.trim()
                : undefined,
            department: department
                ? department.trim()
                : undefined,
            program: program
                ? program.trim()
                : undefined,
            semester: normalizedSemester,
            academicYear: academicYear
                ? academicYear.trim()
                : undefined,
            phone: phone
                ? phone.trim()
                : undefined,
            status: "active"
        });

        // Create login token
        const token = jwt.sign(
            {
                userId: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.status(201).json({
            message:
                "User registered successfully",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                studentId: user.studentId,
                department: user.department,
                program: user.program,
                semester: user.semester,
                academicYear:
                    user.academicYear,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error(
            "Registration error:",
            error.message
        );

        if (error.code === 11000) {
            return res.status(409).json({
                message:
                    "Email or student ID already exists"
            });
        }

        if (
            error.name ===
            "ValidationError"
        ) {
            return res.status(400).json({
                message:
                    "Invalid registration data",
                errors: Object.values(
                    error.errors
                ).map(
                    (item) => item.message
                )
            });
        }

        if (
            error.name ===
            "CastError"
        ) {
            return res.status(400).json({
                message:
                    "Invalid registration field format"
            });
        }

        res.status(500).json({
            message:
                "Server error during registration"
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message:
                    "Email and password are required"
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        }).select("+password");

        if (!user) {
            return res.status(401).json({
                message:
                    "Invalid email or password"
            });
        }

        if (user.status !== "active") {
            return res.status(403).json({
                message: "Account is inactive"
            });
        }

        const isPasswordValid =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!isPasswordValid) {
            return res.status(401).json({
                message:
                    "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                userId: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                studentId: user.studentId,
                department: user.department,
                program: user.program,
                semester: user.semester,
                academicYear:
                    user.academicYear,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error(
            "Login error:",
            error.message
        );

        res.status(500).json({
            message:
                "Server error during login"
        });
    }
};

module.exports = {
    registerUser,
    loginUser
};