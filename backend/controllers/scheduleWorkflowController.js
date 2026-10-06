const { handleError } = require("../utils/http");
const workflow = require("../services/scheduleWorkflowService");

const respond = (res, status, body) => res.status(status).json(body);

const run = (handler, status = 200) => async (req, res) => {
    try {
        const body = await handler(req);
        return respond(res, status, body);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        return handleError(res, error, "Schedule workflow error:");
    }
};

module.exports = {
    workflowSummary: run(workflow.workflowSummary),
    getApproval: run(workflow.getApproval),
    listVersions: run(workflow.listVersions),
    getVersion: run(workflow.getVersion),
    compareVersions: run(workflow.compareVersions),
    submitReview: run(workflow.submitReview),
    verifyDepartment: run(workflow.verifyDepartment),
    approveAcademic: run(workflow.approveAcademic),
    returnSchedule: run(workflow.returnSchedule),
    createNextVersion: run(workflow.createNextVersion, 201),
    updateVersion: run(workflow.updateVersion),
    publishVersion: run(workflow.publishVersion),
    getImpact: run(workflow.getImpact)
};
