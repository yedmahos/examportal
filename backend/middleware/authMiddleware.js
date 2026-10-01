const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { roleSatisfies } = require("../utils/roles");

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.userId)
            .select("role status");

        if (!user || user.status !== "active") {
            return res.status(401).json({
                message: "Account is inactive"
            });
        }

        req.user = {
            userId: user._id.toString(),
            role: user.role
        };

        next();
    } catch (error) {
        console.error("Authentication error:", error.message);

        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roleSatisfies(req.user.role, roles)) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        next();
    };
};

module.exports = {
    protect,
    authorize
};