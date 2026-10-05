const AcademicYear = require("../models/AcademicYear");
const Department = require("../models/Department");
const Program = require("../models/Program");
const Batch = require("../models/Batch");
const Section = require("../models/Section");
const {
    escapeRegex,
    parsePagination,
    paginationMeta,
    parseSemester
} = require("../utils/query");
const {
    isObjectId,
    invalidId,
    handleError,
    parseDateOnly
} = require("../utils/http");
const {
    departmentScope,
    assertDepartment,
    ownedProgramIds,
    ownedBatchIds,
    restrictToIds
} = require("../utils/departmentScope");

const sendList = (res, items, page, limit, total) => {
    res.status(200).json({
        items,
        ...paginationMeta({ page, limit, total })
    });
};

const statusValue = (value) => {
    if (value === "active" || value === "inactive") {
        return value;
    }

    return null;
};

const createAcademicYear = async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const startDate = parseDateOnly(req.body.startDate);
        const endDate = parseDateOnly(req.body.endDate);

        if (!name || !startDate || !endDate) {
            return res.status(400).json({
                message: "Name, startDate and endDate are required"
            });
        }

        if (endDate < startDate) {
            return res.status(400).json({
                message: "End date must be on or after the start date"
            });
        }

        if (req.body.isActive === true) {
            await AcademicYear.updateMany({}, { isActive: false });
        }

        const academicYear = await AcademicYear.create({
            name,
            startDate,
            endDate,
            isActive: req.body.isActive === true
        });

        res.status(201).json({
            message: "Academic year created",
            item: academicYear
        });
    } catch (error) {
        return handleError(res, error, "Create academic year error:");
    }
};

const listAcademicYears = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const query = {};

        if (req.query.search) {
            query.name = new RegExp(escapeRegex(req.query.search), "i");
        }

        if (req.query.isActive === "true") {
            query.isActive = true;
        }

        const [items, total] = await Promise.all([
            AcademicYear.find(query).sort({ startDate: -1 }).skip(skip).limit(limit),
            AcademicYear.countDocuments(query)
        ]);

        return sendList(res, items, page, limit, total);
    } catch (error) {
        return handleError(res, error, "List academic years error:");
    }
};

const getAcademicYear = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) {
            return invalidId(res, "academic year id");
        }

        const item = await AcademicYear.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: "Academic year not found" });
        }

        res.status(200).json({ item });
    } catch (error) {
        return handleError(res, error, "Get academic year error:");
    }
};

const updateAcademicYear = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) {
            return invalidId(res, "academic year id");
        }

        const updates = {};

        if (req.body.name !== undefined) {
            updates.name = String(req.body.name).trim();
            if (!updates.name) {
                return res.status(400).json({ message: "Name is required" });
            }
        }

        if (req.body.startDate !== undefined) {
            updates.startDate = parseDateOnly(req.body.startDate);
            if (!updates.startDate) {
                return res.status(400).json({ message: "Invalid start date" });
            }
        }

        if (req.body.endDate !== undefined) {
            updates.endDate = parseDateOnly(req.body.endDate);
            if (!updates.endDate) {
                return res.status(400).json({ message: "Invalid end date" });
            }
        }

        if (req.body.isActive !== undefined) {
            updates.isActive = req.body.isActive === true;
        }

        const current = await AcademicYear.findById(req.params.id);

        if (!current) {
            return res.status(404).json({ message: "Academic year not found" });
        }

        const nextStart = updates.startDate || current.startDate;
        const nextEnd = updates.endDate || current.endDate;

        if (nextEnd < nextStart) {
            return res.status(400).json({
                message: "End date must be on or after the start date"
            });
        }

        if (updates.isActive === true) {
            await AcademicYear.updateMany(
                { _id: { $ne: req.params.id } },
                { isActive: false }
            );
        }

        const item = await AcademicYear.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            message: "Academic year updated",
            item
        });
    } catch (error) {
        return handleError(res, error, "Update academic year error:");
    }
};

const createDepartment = async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const code = String(req.body.code || "").trim().toUpperCase();
        const status = statusValue(req.body.status || "active");

        if (!name || !code || !status) {
            return res.status(400).json({
                message: "Name, code and a valid status are required"
            });
        }

        const item = await Department.create({ name, code, status });

        res.status(201).json({
            message: "Department created",
            item
        });
    } catch (error) {
        return handleError(res, error, "Create department error:");
    }
};

const listDepartments = async (req, res) => {
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

        const scope = await departmentScope(req);
        if (scope) query._id = scope._id;

        const [items, total] = await Promise.all([
            Department.find(query).sort({ name: 1 }).skip(skip).limit(limit),
            Department.countDocuments(query)
        ]);

        return sendList(res, items, page, limit, total);
    } catch (error) {
        return handleError(res, error, "List departments error:");
    }
};

const getDepartment = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) {
            return invalidId(res, "department id");
        }

        const item = await Department.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: "Department not found" });
        }

        assertDepartment(await departmentScope(req), item._id);

        res.status(200).json({ item });
    } catch (error) {
        return handleError(res, error, "Get department error:");
    }
};

const updateDepartment = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) {
            return invalidId(res, "department id");
        }

        const updates = {};

        if (req.body.name !== undefined) {
            updates.name = String(req.body.name).trim();
        }

        if (req.body.code !== undefined) {
            updates.code = String(req.body.code).trim().toUpperCase();
        }

        if (req.body.status !== undefined) {
            updates.status = statusValue(req.body.status);
            if (!updates.status) {
                return res.status(400).json({ message: "Invalid status" });
            }
        }

        const item = await Department.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        if (!item) {
            return res.status(404).json({ message: "Department not found" });
        }

        res.status(200).json({ message: "Department updated", item });
    } catch (error) {
        return handleError(res, error, "Update department error:");
    }
};

const createProgram = async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const code = String(req.body.code || "").trim().toUpperCase();
        const duration = Number(req.body.duration);
        const status = statusValue(req.body.status || "active");

        if (!name || !code || !isObjectId(req.body.department) || !status) {
            return res.status(400).json({
                message: "Name, code, department and status are required"
            });
        }

        if (!Number.isFinite(duration) || duration < 1) {
            return res.status(400).json({ message: "Duration must be at least 1 year" });
        }

        const department = await Department.findById(req.body.department);

        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }

        const item = await Program.create({
            name,
            code,
            department: department._id,
            duration,
            status
        });

        res.status(201).json({
            message: "Program created",
            item: await item.populate("department", "name code")
        });
    } catch (error) {
        return handleError(res, error, "Create program error:");
    }
};

const listPrograms = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const query = {};

        if (req.query.department) {
            if (!isObjectId(req.query.department)) {
                return invalidId(res, "department id");
            }
            query.department = req.query.department;
        }

        if (req.query.status === "active" || req.query.status === "inactive") {
            query.status = req.query.status;
        }

        if (req.query.search) {
            const regex = new RegExp(escapeRegex(req.query.search), "i");
            query.$or = [{ name: regex }, { code: regex }];
        }

        const scope = await departmentScope(req);
        restrictToIds(query, "department", scope ? [scope._id] : null);

        const [items, total] = await Promise.all([
            Program.find(query)
                .populate("department", "name code")
                .sort({ name: 1 })
                .skip(skip)
                .limit(limit),
            Program.countDocuments(query)
        ]);

        return sendList(res, items, page, limit, total);
    } catch (error) {
        return handleError(res, error, "List programs error:");
    }
};

const getProgram = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) {
            return invalidId(res, "program id");
        }

        const item = await Program.findById(req.params.id)
            .populate("department", "name code");

        if (!item) {
            return res.status(404).json({ message: "Program not found" });
        }

        assertDepartment(await departmentScope(req), item.department?._id || item.department);

        res.status(200).json({ item });
    } catch (error) {
        return handleError(res, error, "Get program error:");
    }
};

const updateProgram = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) {
            return invalidId(res, "program id");
        }

        const updates = {};

        if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
        if (req.body.code !== undefined) updates.code = String(req.body.code).trim().toUpperCase();

        if (req.body.duration !== undefined) {
            const duration = Number(req.body.duration);
            if (!Number.isFinite(duration) || duration < 1) {
                return res.status(400).json({ message: "Duration must be at least 1 year" });
            }
            updates.duration = duration;
        }

        if (req.body.department !== undefined) {
            if (!isObjectId(req.body.department)) {
                return invalidId(res, "department id");
            }
            const department = await Department.findById(req.body.department);
            if (!department) {
                return res.status(404).json({ message: "Department not found" });
            }
            updates.department = department._id;
        }

        if (req.body.status !== undefined) {
            updates.status = statusValue(req.body.status);
            if (!updates.status) {
                return res.status(400).json({ message: "Invalid status" });
            }
        }

        const item = await Program.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).populate("department", "name code");

        if (!item) {
            return res.status(404).json({ message: "Program not found" });
        }

        res.status(200).json({ message: "Program updated", item });
    } catch (error) {
        return handleError(res, error, "Update program error:");
    }
};

const createBatch = async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const semester = parseSemester(req.body.semester);
        const status = statusValue(req.body.status || "active");

        if (
            !name ||
            !isObjectId(req.body.academicYear) ||
            !isObjectId(req.body.program) ||
            !semester ||
            semester < 1 ||
            semester > 12 ||
            !status
        ) {
            return res.status(400).json({
                message: "Name, academic year, program, semester and status are required"
            });
        }

        const [academicYear, program] = await Promise.all([
            AcademicYear.findById(req.body.academicYear),
            Program.findById(req.body.program)
        ]);

        if (!academicYear) {
            return res.status(404).json({ message: "Academic year not found" });
        }

        if (!program) {
            return res.status(404).json({ message: "Program not found" });
        }

        const item = await Batch.create({
            name,
            academicYear: academicYear._id,
            program: program._id,
            semester,
            status
        });

        const populated = await item.populate([
            { path: "academicYear", select: "name" },
            { path: "program", select: "name code" }
        ]);

        res.status(201).json({ message: "Batch created", item: populated });
    } catch (error) {
        return handleError(res, error, "Create batch error:");
    }
};

const listBatches = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const query = {};

        if (req.query.program) {
            if (!isObjectId(req.query.program)) return invalidId(res, "program id");
            query.program = req.query.program;
        }

        if (req.query.academicYear) {
            if (!isObjectId(req.query.academicYear)) return invalidId(res, "academic year id");
            query.academicYear = req.query.academicYear;
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
            query.name = new RegExp(escapeRegex(req.query.search), "i");
        }

        restrictToIds(query, "program", await ownedProgramIds(await departmentScope(req)));

        const [items, total] = await Promise.all([
            Batch.find(query)
                .populate("academicYear", "name")
                .populate("program", "name code department")
                .sort({ name: 1 })
                .skip(skip)
                .limit(limit),
            Batch.countDocuments(query)
        ]);

        return sendList(res, items, page, limit, total);
    } catch (error) {
        return handleError(res, error, "List batches error:");
    }
};

const getBatch = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "batch id");

        const item = await Batch.findById(req.params.id)
            .populate("academicYear", "name")
            .populate({
                path: "program",
                select: "name code department",
                populate: { path: "department", select: "name code" }
            });

        if (!item) return res.status(404).json({ message: "Batch not found" });

        assertDepartment(
            await departmentScope(req),
            item.program?.department?._id || item.program?.department
        );

        res.status(200).json({ item });
    } catch (error) {
        return handleError(res, error, "Get batch error:");
    }
};

const updateBatch = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "batch id");

        const updates = {};

        if (req.body.name !== undefined) updates.name = String(req.body.name).trim();

        if (req.body.semester !== undefined) {
            const semester = parseSemester(req.body.semester);
            if (!semester || semester < 1 || semester > 12) {
                return res.status(400).json({ message: "Semester must be between 1 and 12" });
            }
            updates.semester = semester;
        }

        if (req.body.academicYear !== undefined) {
            if (!isObjectId(req.body.academicYear)) return invalidId(res, "academic year id");
            const academicYear = await AcademicYear.findById(req.body.academicYear);
            if (!academicYear) return res.status(404).json({ message: "Academic year not found" });
            updates.academicYear = academicYear._id;
        }

        if (req.body.program !== undefined) {
            if (!isObjectId(req.body.program)) return invalidId(res, "program id");
            const program = await Program.findById(req.body.program);
            if (!program) return res.status(404).json({ message: "Program not found" });
            updates.program = program._id;
        }

        if (req.body.status !== undefined) {
            updates.status = statusValue(req.body.status);
            if (!updates.status) return res.status(400).json({ message: "Invalid status" });
        }

        const item = await Batch.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        )
            .populate("academicYear", "name")
            .populate("program", "name code");

        if (!item) return res.status(404).json({ message: "Batch not found" });

        res.status(200).json({ message: "Batch updated", item });
    } catch (error) {
        return handleError(res, error, "Update batch error:");
    }
};

const createSection = async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const status = statusValue(req.body.status || "active");

        if (!name || !isObjectId(req.body.batch) || !status) {
            return res.status(400).json({
                message: "Name, batch and status are required"
            });
        }

        const batch = await Batch.findById(req.body.batch);

        if (!batch) return res.status(404).json({ message: "Batch not found" });

        const item = await Section.create({
            name,
            batch: batch._id,
            status
        });

        res.status(201).json({
            message: "Section created",
            item: await item.populate("batch", "name semester")
        });
    } catch (error) {
        return handleError(res, error, "Create section error:");
    }
};

const listSections = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const query = {};

        if (req.query.batch) {
            if (!isObjectId(req.query.batch)) return invalidId(res, "batch id");
            query.batch = req.query.batch;
        }

        if (req.query.status === "active" || req.query.status === "inactive") {
            query.status = req.query.status;
        }

        if (req.query.search) {
            query.name = new RegExp(escapeRegex(req.query.search), "i");
        }

        restrictToIds(query, "batch", await ownedBatchIds(await departmentScope(req)));

        const [items, total] = await Promise.all([
            Section.find(query)
                .populate({
                    path: "batch",
                    select: "name semester program academicYear",
                    populate: { path: "program", select: "name code" }
                })
                .sort({ name: 1 })
                .skip(skip)
                .limit(limit),
            Section.countDocuments(query)
        ]);

        return sendList(res, items, page, limit, total);
    } catch (error) {
        return handleError(res, error, "List sections error:");
    }
};

const getSection = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "section id");

        const item = await Section.findById(req.params.id).populate("batch", "name semester");

        if (!item) return res.status(404).json({ message: "Section not found" });

        const scope = await departmentScope(req);
        if (scope) {
            const batch = await Batch.findById(item.batch?._id || item.batch).populate("program", "department");
            assertDepartment(scope, batch?.program?.department);
        }

        res.status(200).json({ item });
    } catch (error) {
        return handleError(res, error, "Get section error:");
    }
};

const updateSection = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "section id");

        const updates = {};

        if (req.body.name !== undefined) updates.name = String(req.body.name).trim();

        if (req.body.batch !== undefined) {
            if (!isObjectId(req.body.batch)) return invalidId(res, "batch id");
            const batch = await Batch.findById(req.body.batch);
            if (!batch) return res.status(404).json({ message: "Batch not found" });
            updates.batch = batch._id;
        }

        if (req.body.status !== undefined) {
            updates.status = statusValue(req.body.status);
            if (!updates.status) return res.status(400).json({ message: "Invalid status" });
        }

        const item = await Section.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).populate("batch", "name semester");

        if (!item) return res.status(404).json({ message: "Section not found" });

        res.status(200).json({ message: "Section updated", item });
    } catch (error) {
        return handleError(res, error, "Update section error:");
    }
};

module.exports = {
    createAcademicYear,
    listAcademicYears,
    getAcademicYear,
    updateAcademicYear,
    createDepartment,
    listDepartments,
    getDepartment,
    updateDepartment,
    createProgram,
    listPrograms,
    getProgram,
    updateProgram,
    createBatch,
    listBatches,
    getBatch,
    updateBatch,
    createSection,
    listSections,
    getSection,
    updateSection
};
