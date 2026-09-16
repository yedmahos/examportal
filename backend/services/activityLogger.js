const ActivityLog = require("../models/ActivityLog");

const logActivity = async ({
    user,
    action,
    entity,
    entityId = null,
    description,
    ipAddress = ""
}) => {
    try {
        await ActivityLog.create({
            user,
            action,
            entity,
            entityId,
            description,
            ipAddress
        });
    } catch (error) {
        console.error("Activity log error:", error.message);
    }
};

module.exports = {
    logActivity
};