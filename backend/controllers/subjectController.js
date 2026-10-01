const Subject = require("../models/Subject");
const Department = require("../models/Department");
const Program = require("../models/Program");
const {
    escapeRegex,
    parsePagination,
    paginationMeta,
    parseSemester
} = require("../utils/query");
const { isObjectId, invalidId, handleError } = require("../utils/http");

const SUBJECT_TYPES = ["theory", "practical", "elective", "viva", "lab"];

const populateSubject = (query) => {
    return query
        .populate("department", "name code")
        .populate("program", "name code");
};

const createSubject = async (req, res) => {
    try {
        const code = String(req.body.code || "").trim().toUpperCase();
        const name = String(req.body.name || "").trim();
        const semester = parseSemester(req.body.semester);
        const duration = Number(req.body.duration);

        if (
            !code ||
            !name ||
            !SUBJECT_TYPES.includes(req.body.subjectType) ||
            !isObjectId(req.body.department) ||
            !isObjectId(req.body.program) ||
            !semester ||
            semester < 1 ||
            semester > 12 ||
            !Number.isFinite(duration) ||
            duration < 1
        ) {
            return res.status(400).json({
                message: "Code, name, type, department, program, semester and duration are required"
            });
        }

        const [department, program] = await Promise.all([
            Department.findById(req.body.department),
            Program.findById(req.body.program)
        ]);

        if (!department) return res.status(404).json({ message: "Department not found" });
        if (!program) return res.status(404).json({ message: "Program not found" });

        if (String(program.department) !== String(department._id)) {
            return res.status(400).json({
                message: "Program does not belong to the selected department"
            });
        }

        const payload = {
            code,
            name,
            subjectType: req.body.subjectType,
            department: department._id,
            program: program._id,
            semester,
            duration,
            description: String(req.body.description || "").trim(),
            status: req.body.status === "inactive" ? "inactive" : "active"
        };

        if (req.body.credits !== undefined && req.body.credits !== "") {
            const credits = Number(req.body.credits);
            if (!Number.isFinite(credits) || credits < 0) {
                return res.status(400).json({ message: "Credits must be a positive number" });
            }
            payload.credits = credits;
        }

        const created = await Subject.create(payload);
        const item = await populateSubject(Subject.findById(created._id));

        res.status(201).json({ message: "Subject created", item });
    } catch (error) {
        return handleError(res, error, "Create subject error:");
    }
};

const listSubjects = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const query = {};

        if (req.query.department) {
            if (!isObjectId(req.query.department)) return invalidId(res, "department id");
            query.department = req.query.department;
        }

        if (req.query.program) {
            if (!isObjectId(req.query.program)) return invalidId(res, "program id");
            query.program = req.query.program;
        }

        if (req.query.semester) {
            const semester = parseSemester(req.query.semester);
            if (!semester) return res.status(400).json({ message: "Invalid semester" });
            query.semester = semester;
        }

        if (req.query.status === "active" || req.query.status === "inactive") {
            query.status = req.query.status;
        }

        if (req.query.search) {
            const regex = new RegExp(escapeRegex(req.query.search), "i");
            query.$or = [{ name: regex }, { code: regex }];
        }

        const [items, total] = await Promise.all([
            populateSubject(Subject.find(query).sort({ code: 1 }).skip(skip).limit(limit)),
            Subject.countDocuments(query)
        ]);

        res.status(200).json({
            items,
            ...paginationMeta({ page, limit, total })
        });
    } catch (error) {
        return handleError(res, error, "List subjects error:");
    }
};

const getSubject = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "subject id");

        const item = await populateSubject(Subject.findById(req.params.id));

        if (!item) return res.status(404).json({ message: "Subject not found" });

        res.status(200).json({ item });
    } catch (error) {
        return handleError(res, error, "Get subject error:");
    }
};

const updateSubject = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "subject id");

        const current = await Subject.findById(req.params.id);

        if (!current) return res.status(404).json({ message: "Subject not found" });

        const updates = {};

        if (req.body.code !== undefined) updates.code = String(req.body.code).trim().toUpperCase();
        if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
        if (req.body.description !== undefined) {
            updates.description = String(req.body.description).trim();
        }

        if (req.body.subjectType !== undefined) {
            if (!SUBJECT_TYPES.includes(req.body.subjectType)) {
                return res.status(400).json({ message: "Invalid subject type" });
            }
            updates.subjectType = req.body.subjectType;
        }

        if (req.body.semester !== undefined) {
            const semester = parseSemester(req.body.semester);
            if (!semester || semester < 1 || semester > 12) {
                return res.status(400).json({ message: "Semester must be between 1 and 12" });
            }
            updates.semester = semester;
        }

        if (req.body.duration !== undefined) {
            const duration = Number(req.body.duration);
            if (!Number.isFinite(duration) || duration < 1) {
                return res.status(400).json({ message: "Duration must be greater than 0" });
            }
            updates.duration = duration;
        }

        if (req.body.credits !== undefined && req.body.credits !== "") {
            const credits = Number(req.body.credits);
            if (!Number.isFinite(credits) || credits < 0) {
                return res.status(400).json({ message: "Credits must be a positive number" });
            }
            updates.credits = credits;
        }

        if (req.body.status !== undefined) {
            if (req.body.status !== "active" && req.body.status !== "inactive") {
                return res.status(400).json({ message: "Invalid status" });
            }
            updates.status = req.body.status;
        }

        const departmentId = req.body.department || current.department;
        const programId = req.body.program || current.program;

        if (req.body.department !== undefined) {
            if (!isObjectId(req.body.department)) return invalidId(res, "department id");
            const department = await Department.findById(req.body.department);
            if (!department) return res.status(404).json({ message: "Department not found" });
            updates.department = department._id;
        }

        if (req.body.program !== undefined) {
            if (!isObjectId(req.body.program)) return invalidId(res, "program id");
            updates.program = req.body.program;
        }

        if (req.body.department !== undefined || req.body.program !== undefined) {
            const program = await Program.findById(programId);
            if (!program) return res.status(404).json({ message: "Program not found" });
            if (String(program.department) !== String(departmentId)) {
                return res.status(400).json({
                    message: "Program does not belong to the selected department"
                });
            }
            updates.program = program._id;
        }

        const item = await populateSubject(
            Subject.findByIdAndUpdate(req.params.id, updates, {
                new: true,
                runValidators: true
            })
        );

        res.status(200).json({ message: "Subject updated", item });
    } catch (error) {
        return handleError(res, error, "Update subject error:");
    }
};

const verifySubject = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "subject id");

        if (!["verified", "unverified"].includes(req.body.verificationStatus)) {
            return res.status(400).json({
                message: "verificationStatus must be verified or unverified"
            });
        }

        const item = await populateSubject(
            Subject.findByIdAndUpdate(
                req.params.id,
                { verificationStatus: req.body.verificationStatus },
                { new: true }
            )
        );

        if (!item) return res.status(404).json({ message: "Subject not found" });

        res.status(200).json({ message: "Subject verification updated", item });
    } catch (error) {
        return handleError(res, error, "Verify subject error:");
    }
};

module.exports = {
    createSubject,
    listSubjects,
    getSubject,
    updateSubject,
    verifySubject
};
