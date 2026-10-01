const ExamType = require("../models/ExamType");
const {
    escapeRegex,
    parsePagination,
    paginationMeta
} = require("../utils/query");
const { isObjectId, invalidId, handleError } = require("../utils/http");

const createExamType = async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const code = String(req.body.code || "").trim().toUpperCase();
        const description = String(req.body.description || "").trim();

        if (!name || !code) {
            return res.status(400).json({ message: "Name and code are required" });
        }

        const item = await ExamType.create({
            name,
            code,
            description,
            isCustom: true,
            status: req.body.status === "inactive" ? "inactive" : "active",
            createdBy: req.user.userId
        });

        res.status(201).json({ message: "Exam type created", item });
    } catch (error) {
        return handleError(res, error, "Create exam type error:");
    }
};

const listExamTypes = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const query = {};

        if (req.query.status === "active" || req.query.status === "inactive") {
            query.status = req.query.status;
        }

        if (req.query.search) {
            const regex = new RegExp(escapeRegex(req.query.search), "i");
            query.$or = [{ name: regex }, { code: regex }];
        }

        const [items, total] = await Promise.all([
            ExamType.find(query).sort({ isCustom: 1, name: 1 }).skip(skip).limit(limit),
            ExamType.countDocuments(query)
        ]);

        res.status(200).json({
            items,
            ...paginationMeta({ page, limit, total })
        });
    } catch (error) {
        return handleError(res, error, "List exam types error:");
    }
};

const updateExamType = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "exam type id");

        const current = await ExamType.findById(req.params.id);

        if (!current) return res.status(404).json({ message: "Exam type not found" });

        const updates = {};

        if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
        if (req.body.description !== undefined) {
            updates.description = String(req.body.description).trim();
        }

        if (req.body.code !== undefined) {
            if (!current.isCustom) {
                return res.status(400).json({
                    message: "Built-in exam type codes cannot be changed"
                });
            }
            updates.code = String(req.body.code).trim().toUpperCase();
        }

        if (req.body.status !== undefined) {
            if (req.body.status !== "active" && req.body.status !== "inactive") {
                return res.status(400).json({ message: "Invalid status" });
            }
            updates.status = req.body.status;
        }

        const item = await ExamType.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        res.status(200).json({ message: "Exam type updated", item });
    } catch (error) {
        return handleError(res, error, "Update exam type error:");
    }
};

const setExamTypeStatus = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "exam type id");

        if (req.body.status !== "active" && req.body.status !== "inactive") {
            return res.status(400).json({ message: "Status must be active or inactive" });
        }

        const item = await ExamType.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );

        if (!item) return res.status(404).json({ message: "Exam type not found" });

        res.status(200).json({ message: "Exam type status updated", item });
    } catch (error) {
        return handleError(res, error, "Exam type status error:");
    }
};

module.exports = {
    createExamType,
    listExamTypes,
    updateExamType,
    setExamTypeStatus
};
