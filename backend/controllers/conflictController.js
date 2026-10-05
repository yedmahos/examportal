const Exam = require("../models/Exam");
const Subject = require("../models/Subject");
const ExamSession = require("../models/ExamSession");
const { snapshotEligibleStudentIds } = require("../services/eligibilityService");
const { detectConflicts } = require("../services/conflictDetectionService");
const {
    isObjectId,
    handleError,
    parseDateOnly
} = require("../utils/http");
const { departmentScope, assertDepartment } = require("../utils/departmentScope");

const checkConflicts = async (req, res) => {
    try {
        const date = parseDateOnly(req.body.date);

        if (
            !isObjectId(req.body.examination) ||
            !isObjectId(req.body.subject) ||
            !isObjectId(req.body.session) ||
            !date
        ) {
            return res.status(400).json({
                message: "Examination, subject, date and session are required"
            });
        }

        const [examination, subject, session] = await Promise.all([
            Exam.findOne({ _id: req.body.examination, isArchived: false }),
            Subject.findById(req.body.subject),
            ExamSession.findById(req.body.session)
        ]);

        if (!examination) return res.status(404).json({ message: "Examination not found" });
        if (!subject) return res.status(404).json({ message: "Subject not found" });
        if (!session) return res.status(404).json({ message: "Session not found" });

        assertDepartment(await departmentScope(req), subject.department);

        if (subject.verificationStatus !== "verified") {
            return res.status(400).json({
                message: "Subject must be verified before it can be scheduled"
            });
        }

        if (req.body.room && !isObjectId(req.body.room)) {
            return res.status(400).json({ message: "Invalid room id" });
        }

        const students = await snapshotEligibleStudentIds({
            examinationId: examination._id,
            subjectId: subject._id
        });

        const result = await detectConflicts({
            examinationId: examination._id,
            subjectId: subject._id,
            date,
            sessionId: session._id,
            roomId: req.body.room || null,
            eligibleStudentIds: students,
            ignoreScheduleId: isObjectId(req.body.ignoreScheduleId)
                ? req.body.ignoreScheduleId
                : null
        });

        res.status(200).json({
            eligibleStudents: students.length,
            ...result
        });
    } catch (error) {
        return handleError(res, error, "Conflict check error:");
    }
};

module.exports = {
    checkConflicts
};
