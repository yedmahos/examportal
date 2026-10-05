const Enrollment = require("../models/Enrollment");
const User = require("../models/User");
const Program = require("../models/Program");
const Batch = require("../models/Batch");
const Section = require("../models/Section");
const AcademicYear = require("../models/AcademicYear");
const {
    parsePagination,
    paginationMeta,
    parseSemester
} = require("../utils/query");
const { isObjectId, invalidId, handleError } = require("../utils/http");
const {
    departmentScope,
    assertDepartment,
    ownedProgramIds,
    restrictToIds
} = require("../utils/departmentScope");

const populateEnrollment = (query) => {
    return query
        .populate("student", "name studentId email")
        .populate("program", "name code")
        .populate("batch", "name semester")
        .populate("section", "name")
        .populate("academicYear", "name");
};

const createEnrollment = async (req, res) => {
    try {
        const semester = parseSemester(req.body.semester);
        const ids = ["student", "program", "batch", "section", "academicYear"];

        if (ids.some((field) => !isObjectId(req.body[field])) || !semester) {
            return res.status(400).json({
                message: "Student, program, batch, section, academic year and semester are required"
            });
        }

        const [student, program, batch, section, academicYear] = await Promise.all([
            User.findById(req.body.student),
            Program.findById(req.body.program),
            Batch.findById(req.body.batch),
            Section.findById(req.body.section),
            AcademicYear.findById(req.body.academicYear)
        ]);

        if (!student || student.role !== "student") {
            return res.status(404).json({ message: "Student not found" });
        }
        if (!program) return res.status(404).json({ message: "Program not found" });
        assertDepartment(await departmentScope(req), program.department);
        if (!batch) return res.status(404).json({ message: "Batch not found" });
        if (!section) return res.status(404).json({ message: "Section not found" });
        if (!academicYear) return res.status(404).json({ message: "Academic year not found" });

        if (String(batch.program) !== String(program._id)) {
            return res.status(400).json({ message: "Batch does not belong to the selected program" });
        }

        if (String(batch.academicYear) !== String(academicYear._id)) {
            return res.status(400).json({ message: "Batch does not belong to the selected academic year" });
        }

        if (String(section.batch) !== String(batch._id)) {
            return res.status(400).json({ message: "Section does not belong to the selected batch" });
        }

        const created = await Enrollment.create({
            student: student._id,
            program: program._id,
            batch: batch._id,
            section: section._id,
            academicYear: academicYear._id,
            semester,
            status: ["active", "inactive", "completed"].includes(req.body.status)
                ? req.body.status
                : "active"
        });

        const item = await populateEnrollment(Enrollment.findById(created._id));

        res.status(201).json({ message: "Enrollment created", item });
    } catch (error) {
        return handleError(res, error, "Create enrollment error:");
    }
};

const listEnrollments = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const query = {};

        ["student", "program", "batch", "section", "academicYear"].forEach((field) => {
            if (req.query[field]) {
                query[field] = req.query[field];
            }
        });

        for (const field of Object.keys(query)) {
            if (!isObjectId(query[field])) {
                return invalidId(res, `${field} id`);
            }
        }

        if (req.query.semester) {
            const semester = parseSemester(req.query.semester);
            if (!semester) return res.status(400).json({ message: "Invalid semester" });
            query.semester = semester;
        }

        if (req.query.status) {
            query.status = req.query.status;
        }

        restrictToIds(query, "program", await ownedProgramIds(await departmentScope(req)));

        const [items, total] = await Promise.all([
            populateEnrollment(
                Enrollment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
            ),
            Enrollment.countDocuments(query)
        ]);

        res.status(200).json({
            items,
            ...paginationMeta({ page, limit, total })
        });
    } catch (error) {
        return handleError(res, error, "List enrollments error:");
    }
};

const updateEnrollment = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "enrollment id");

        const updates = {};

        if (req.body.status !== undefined) {
            if (!["active", "inactive", "completed"].includes(req.body.status)) {
                return res.status(400).json({ message: "Invalid enrollment status" });
            }
            updates.status = req.body.status;
        }

        if (req.body.section !== undefined) {
            if (!isObjectId(req.body.section)) return invalidId(res, "section id");
            const section = await Section.findById(req.body.section);
            if (!section) return res.status(404).json({ message: "Section not found" });
            updates.section = section._id;
        }

        if (!Object.keys(updates).length) {
            return res.status(400).json({ message: "No valid fields provided for update" });
        }

        const current = await Enrollment.findById(req.params.id).populate("program", "department");
        if (!current) return res.status(404).json({ message: "Enrollment not found" });
        assertDepartment(await departmentScope(req), current.program?.department);

        const item = await populateEnrollment(
            Enrollment.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
        );

        if (!item) return res.status(404).json({ message: "Enrollment not found" });

        res.status(200).json({ message: "Enrollment updated", item });
    } catch (error) {
        return handleError(res, error, "Update enrollment error:");
    }
};

module.exports = {
    createEnrollment,
    listEnrollments,
    updateEnrollment
};
