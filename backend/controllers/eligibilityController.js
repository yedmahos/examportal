const mongoose = require("mongoose");
const ExamEligibility = require("../models/ExamEligibility");
const { calculateEligibility } = require("../services/eligibilityService");
const {
    parsePagination,
    paginationMeta
} = require("../utils/query");
const { isObjectId, invalidId, handleError } = require("../utils/http");
const Subject = require("../models/Subject");
const { departmentScope, assertDepartment } = require("../utils/departmentScope");

const calculate = async (req, res) => {
    try {
        const result = await calculateEligibility({
            examinationId: req.body.examination,
            subjectId: req.body.subject
        });

        res.status(200).json({
            message: "Eligibility calculated",
            ...result
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ message: error.message });
        }
        return handleError(res, error, "Calculate eligibility error:");
    }
};

const listEligibility = async (req, res) => {
    try {
        if (!isObjectId(req.query.examination) || !isObjectId(req.query.subject)) {
            return res.status(400).json({
                message: "Examination and subject ids are required"
            });
        }

        const subject = await Subject.findById(req.query.subject).select("department");
        if (!subject) return res.status(404).json({ message: "Subject not found" });
        assertDepartment(await departmentScope(req), subject.department);

        const { page, limit, skip } = parsePagination(req.query);
        const query = {
            examination: req.query.examination,
            subject: req.query.subject
        };

        if (["eligible", "registered", "blocked"].includes(req.query.eligibilityStatus)) {
            query.eligibilityStatus = req.query.eligibilityStatus;
        }

        const [items, total] = await Promise.all([
            ExamEligibility.find(query)
                .populate("student", "name studentId email")
                .populate("subject", "code name")
                .populate("examination", "title")
                .sort({ eligibilityStatus: 1, createdAt: 1 })
                .skip(skip)
                .limit(limit),
            ExamEligibility.countDocuments(query)
        ]);

        const counts = await ExamEligibility.aggregate([
            {
                $match: {
                    examination: new mongoose.Types.ObjectId(req.query.examination),
                    subject: new mongoose.Types.ObjectId(req.query.subject)
                }
            },
            {
                $group: {
                    _id: "$eligibilityStatus",
                    count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            items,
            counts: counts.reduce((accumulator, row) => {
                accumulator[row._id] = row.count;
                return accumulator;
            }, { eligible: 0, registered: 0, blocked: 0 }),
            ...paginationMeta({ page, limit, total })
        });
    } catch (error) {
        return handleError(res, error, "List eligibility error:");
    }
};

const updateEligibility = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "eligibility id");

        const existing = await ExamEligibility.findById(req.params.id).populate("subject", "department");
        if (!existing) return res.status(404).json({ message: "Eligibility record not found" });
        assertDepartment(await departmentScope(req), existing.subject?.department);

        const updates = {};

        if (req.body.eligibilityStatus !== undefined) {
            if (!["eligible", "registered", "blocked"].includes(req.body.eligibilityStatus)) {
                return res.status(400).json({ message: "Invalid eligibility status" });
            }
            updates.eligibilityStatus = req.body.eligibilityStatus;
        }

        ["attendanceStatus", "academicStatus", "examRegistrationStatus", "backlogStatus", "reason"]
            .forEach((field) => {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            });

        if (updates.eligibilityStatus === "blocked" && !String(updates.reason || req.body.reason || "").trim()) {
            const current = await ExamEligibility.findById(req.params.id);
            if (!current?.reason && !String(req.body.reason || "").trim()) {
                return res.status(400).json({
                    message: "A reason is required when a student is blocked"
                });
            }
        }

        if (!Object.keys(updates).length) {
            return res.status(400).json({ message: "No valid fields provided for update" });
        }

        const item = await ExamEligibility.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).populate("student", "name studentId email");

        if (!item) return res.status(404).json({ message: "Eligibility record not found" });

        res.status(200).json({ message: "Eligibility updated", item });
    } catch (error) {
        return handleError(res, error, "Update eligibility error:");
    }
};

module.exports = {
    calculate,
    listEligibility,
    updateEligibility
};
