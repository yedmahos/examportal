const User = require("../models/User");
const { presentUser } = require("../utils/presentUser");

const loadCurrentUser = (userId) => (
    User.findById(userId)
        .select("-password")
        .populate("departmentRef", "name code")
);

const getProfile = async (req, res) => {
    try {
        const user = await loadCurrentUser(req.user.userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            user: presentUser(user)
        });
    } catch (error) {
        console.error("Get profile error:", error.message);

        res.status(500).json({
            message: "Server error while fetching profile"
        });
    }
};

const updateProfile = async (req, res) => {
    try {
        const allowedFields = [
            "name",
            "phone",
            "address",
            "profileImage"
        ];

        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                user[field] = req.body[field];
            }
        }

        await user.save();

        const updatedUser = await loadCurrentUser(user._id);

        res.status(200).json({
            message: "Profile updated successfully",
            user: presentUser(updatedUser)
        });
    } catch (error) {
        console.error("Update profile error:", error.message);

        res.status(500).json({
            message: "Server error while updating profile"
        });
    }
};

module.exports = {
    getProfile,
    updateProfile
};