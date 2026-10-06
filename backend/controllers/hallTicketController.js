const { createHallTicket } = require("../services/hallTicketService");
const { handleError } = require("../utils/http");

const download = async (req, res) => {
    try {
        const ticket = await createHallTicket({
            userId: req.user.userId,
            scheduleId: req.params.scheduleId
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${ticket.filename}"`);
        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("Pragma", "no-cache");
        res.status(200).end(ticket.pdf);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        return handleError(res, error, "Hall ticket error:");
    }
};

module.exports = {
    download
};
