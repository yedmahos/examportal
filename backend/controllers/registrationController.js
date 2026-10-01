const SubjectRegistration = require("../models/SubjectRegistration");
const User = require("../models/User");
const Subject = require("../models/Subject");
const AcademicYear = require("../models/AcademicYear");
const {
    parsePagination,
    paginationMeta,
    parseSemester
} = require("../utils/query");
const { isObjectId, invalidId, handleError } = require("../utils/http");

const populateRegistration = (query) => {
    return query
        .populate("student", "name studentId email")
        .populate("subject", "code name semester subjectType")
        .populate("academicYear", "name");
};

const createRegistration = async (req, res) => {
    try {
        const semester = parseSemester(req.body.semester);

        if (
            !isObjectId(req.body.student) ||
            !isObjectId(req.body.subject) ||
            !isObjectId(req.body.academicYear) ||
            !semester
        ) {
            return res.status(400).json({
                message: "Student, subject, academic year and semester are required"
            });
        }

        const [student, subject, academicYear] = await Promise.all([
            User.findById(req.body.student),
            Subject.findById(req.body.subject),
            AcademicYear.findById(req.body.academicYear)
        ]);

        if (!student || student.role !== "student") {
            return res.status(404).json({ message: "Student not found" });
        }
        if (!subject) return res.status(404).json({ message: "Subject not found" });
        if (!academicYear) return res.status(404).json({ message: "Academic year not found" });

        if (subject.semester !== semester) {
            return res.status(400).json({
                message: "Registration semester does not match the subject semester"
            });
        }

        const status = ["pending", "registered", "dropped"].includes(req.body.registrationStatus)
            ? req.body.registrationStatus
            : "registered";

        const created = await SubjectRegistration.create({
            student: student._id,
            subject: subject._id,
            academicYear: academicYear._id,
            semester,
            registrationStatus: status
        });

        const item = await populateRegistration(SubjectRegistration.findById(created._id));

        res.status(201).json({ message: "Subject registration created", item });
    } catch (error) {
        return handleError(res, error, "Create registration error:");
    }
};

const listRegistrations = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const query = {};

        ["student", "subject", "academicYear"].forEach((field) => {
            if (!req.query[field]) return;
            if (!isObjectId(req.query[field])) {
                query.__invalid = field;
                return;
            }
            query[field] = req.query[field];
        });

        if (query.__invalid) return invalidId(res, `${query.__invalid} id`);

        if (req.query.semester) {
            const semester = parseSemester(req.query.semester);
            if (!semester) return res.status(400).json({ message: "Invalid semester" });
            query.semester = semester;
        }

        if (req.query.registrationStatus) {
            query.registrationStatus = req.query.registrationStatus;
        }

        const [items, total] = await Promise.all([
            populateRegistration(
                SubjectRegistration.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
            ),
            SubjectRegistration.countDocuments(query)
        ]);

        res.status(200).json({
            items,
            ...paginationMeta({ page, limit, total })
        });
    } catch (error) {
        return handleError(res, error, "List registrations error:");
    }
};

const updateRegistration = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "registration id");

        if (!["pending", "registered", "dropped"].includes(req.body.registrationStatus)) {
            return res.status(400).json({ message: "Invalid registration status" });
        }

        const item = await populateRegistration(
            SubjectRegistration.findByIdAndUpdate(
                req.params.id,
                { registrationStatus: req.body.registrationStatus },
                { new: true }
            )
        );

        if (!item) return res.status(404).json({ message: "Registration not found" });

        res.status(200).json({ message: "Registration updated", item });
    } catch (error) {
        return handleError(res, error, "Update registration error:");
    }
};

module.exports = {
    createRegistration,
    listRegistrations,
    updateRegistration
};
