const mongoose = require("mongoose");
const Exam = require("../models/Exam");
const AcademicYear = require("../models/AcademicYear");
const Department = require("../models/Department");
const Program = require("../models/Program");
const Batch = require("../models/Batch");
const ExamType = require("../models/ExamType");
const ExamSession = require("../models/ExamSession");
const { logActivity } = require("../services/activityLogger");
const {
    visibleExaminationIdsForStudent,
    studentCanViewExamination
} = require("../services/eligibilityService");
const { roleSatisfies } = require("../utils/roles");
const { isObjectId, parseDateOnly, isTime } = require("../utils/http");
const {
    departmentScope,
    assertDepartment,
    applyNamedDepartmentScope
} = require("../utils/departmentScope");
const {
    parseSemester,
    escapeRegex,
    parsePagination,
    paginationMeta
} = require("../utils/query");

const EXAM_STATUSES = [
    "scheduled",
    "ongoing",
    "completed",
    "cancelled",
    "postponed"
];

const canonicalExamStatus = (value) => {
    if (value === undefined || value === null || value === "") {
        return "";
    }

    const normalized = String(value).trim().toLowerCase();

    if (
        normalized === "in progress" ||
        normalized === "in-progress" ||
        normalized === "inprogress"
    ) {
        return "ongoing";
    }

    return normalized;
};

const parseDuration = (value) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    if (typeof value === "number") {
        return value;
    }

    const match = String(value).match(/\d+/);

    return match ? Number(match[0]) : null;
};

const normalizeStatus = (value) => {
    const canonical = canonicalExamStatus(value);

    if (!canonical || canonical === "upcoming") {
        return "scheduled";
    }

    return canonical;
};

const creatorFieldsFor = (role) => {
    return roleSatisfies(role, ["admin"])
        ? "name email role"
        : "name role";
};

const populateExamination = (query) => {
    return query
        .populate("createdBy", "name role")
        .populate("examType", "name code status")
        .populate("academicYearRef", "name")
        .populate("departmentRef", "name code")
        .populate("programRef", "name code")
        .populate("eligibleBatches", "name semester")
        .populate("sessions", "name code startTime endTime reportingTime");
};

const createExaminationSetup = async (req, res) => {
    const title = String(req.body.title || req.body.name || "").trim();
    const semester = parseSemester(req.body.semester);
    const startDate = parseDateOnly(req.body.startDate);
    const endDate = parseDateOnly(req.body.endDate);

    if (!title || !semester || semester < 1 || semester > 12 || !startDate || !endDate) {
        return res.status(400).json({
            message: "Title, semester, startDate and endDate are required"
        });
    }

    if (endDate < startDate) {
        return res.status(400).json({
            message: "End date must be on or after the start date"
        });
    }

    if (!isObjectId(req.body.examType) || !isObjectId(req.body.academicYear) || !isObjectId(req.body.department) || !isObjectId(req.body.program)) {
        return res.status(400).json({
            message: "Exam type, academic year, department and program are required"
        });
    }

    const [examType, academicYear, department, program] = await Promise.all([
        ExamType.findById(req.body.examType),
        AcademicYear.findById(req.body.academicYear),
        Department.findById(req.body.department),
        Program.findById(req.body.program)
    ]);

    if (!examType || examType.status !== "active") {
        return res.status(404).json({ message: "Active exam type not found" });
    }
    if (!academicYear) return res.status(404).json({ message: "Academic year not found" });
    if (!department) return res.status(404).json({ message: "Department not found" });
    if (!program) return res.status(404).json({ message: "Program not found" });

    if (String(program.department) !== String(department._id)) {
        return res.status(400).json({
            message: "Program does not belong to the selected department"
        });
    }

    let sessions = [];

    if (req.body.sessions !== undefined) {
        if (!Array.isArray(req.body.sessions)) {
            return res.status(400).json({ message: "Sessions must be an array" });
        }
        sessions = await ExamSession.find({
            _id: { $in: req.body.sessions.filter(isObjectId) },
            status: "active"
        });
        if (sessions.length !== req.body.sessions.length) {
            return res.status(400).json({ message: "One or more sessions are invalid" });
        }
    }

    let eligibleBatches = [];

    if (req.body.eligibleBatches !== undefined) {
        if (!Array.isArray(req.body.eligibleBatches)) {
            return res.status(400).json({ message: "Eligible batches must be an array" });
        }
        eligibleBatches = await Batch.find({
            _id: { $in: req.body.eligibleBatches.filter(isObjectId) },
            program: program._id
        });
        if (eligibleBatches.length !== req.body.eligibleBatches.length) {
            return res.status(400).json({
                message: "One or more batches are invalid for this program"
            });
        }
    }

    if (req.body.reportingTime && !isTime(req.body.reportingTime)) {
        return res.status(400).json({ message: "Reporting time must use HH:MM" });
    }

    const payload = {
        title,
        semester,
        examType: examType._id,
        academicYearRef: academicYear._id,
        academicYear: academicYear.name,
        departmentRef: department._id,
        department: department.name,
        programRef: program._id,
        program: program.name,
        startDate,
        endDate,
        sessions: sessions.map((session) => session._id),
        eligibleBatches: eligibleBatches.map((batch) => batch._id),
        instructions: req.body.instructions || "",
        status: "scheduled",
        createdBy: req.user.userId
    };

    if (req.body.reportingTime) payload.reportingTime = req.body.reportingTime;
    if (req.body.duration) {
        const duration = parseDuration(req.body.duration);
        if (!duration || duration < 1) {
            return res.status(400).json({ message: "Duration must be greater than 0" });
        }
        payload.duration = duration;
    }
    if (req.body.examCode) payload.examCode = String(req.body.examCode).trim();

    const exam = await Exam.create(payload);

    await logActivity({
        user: req.user.userId,
        action: "CREATE",
        entity: "Exam",
        entityId: exam._id,
        description: `Created examination ${exam.title}`,
        ipAddress: req.ip
    });

    const populated = await populateExamination(Exam.findById(exam._id));

    return res.status(201).json({
        message: "Examination created",
        exam: populated
    });
};

const createExam = async (req, res) => {
    try {
        if (req.body.examinationSetup === true) {
            return await createExaminationSetup(req, res);
        }

        const {
            title,
            subject,
            examCode,
            department,
            program,
            semester,
            academicYear,
            examDate,
            date,
            startTime,
            endTime,
            venue,
            room,
            duration,
            instructions,
            status
        } = req.body;

        const normalizedSemester = parseSemester(semester);
        const normalizedDuration = parseDuration(duration);
        const normalizedExamDate = examDate || date;
        const normalizedStatus = normalizeStatus(status);

        if (!EXAM_STATUSES.includes(normalizedStatus)) {
            return res.status(400).json({
                message: "Invalid exam status"
            });
        }

        if (
            !title ||
            !subject ||
            !department ||
            !program ||
            !normalizedSemester ||
            !academicYear ||
            !normalizedExamDate ||
            !startTime ||
            !endTime ||
            !venue ||
            !normalizedDuration
        ) {
            return res.status(400).json({
                message: "All required exam fields must be provided"
            });
        }

        if (
            normalizedSemester < 1 ||
            normalizedSemester > 12
        ) {
            return res.status(400).json({
                message: "Semester must be between 1 and 12"
            });
        }

        if (normalizedDuration < 1) {
            return res.status(400).json({
                message: "Duration must be greater than 0"
            });
        }

        const exam = await Exam.create({
            title: String(title).trim(),
            subject: String(subject).trim(),
            examCode: examCode ? String(examCode).trim() : "",
            department: String(department).trim(),
            program: String(program).trim(),
            semester: normalizedSemester,
            academicYear: String(academicYear).trim(),
            examDate: normalizedExamDate,
            startTime,
            endTime,
            venue: String(venue).trim(),
            room: room ? String(room).trim() : "",
            duration: normalizedDuration,
            instructions: instructions || "",
            status: normalizedStatus,
            createdBy: req.user.userId
        });

        await logActivity({
            user: req.user.userId,
            action: "CREATE",
            entity: "Exam",
            entityId: exam._id,
            description: `Created exam ${exam.title}`,
            ipAddress: req.ip
        });

        res.status(201).json({
            message: "Exam created successfully",
            exam
        });
    } catch (error) {
        console.error("Create exam error:", error);

        res.status(500).json({
            message: "Server error while creating exam"
        });
    }
};

const getAllExams = async (req, res) => {
    try {
        const { search, department, semester, status } = req.query;
        const query = { isArchived: false };

        if (department && department !== "All") {
            query.department = department;
        }

        if (semester && semester !== "All") {
            const semNum = parseSemester(semester);
            if (semNum) query.semester = semNum;
        }

        if (status && status !== "All") {
            const statusVal = canonicalExamStatus(status);

            if (statusVal === "upcoming") {
                query.status = { $in: ["scheduled", "ongoing"] };
            } else if (EXAM_STATUSES.includes(statusVal)) {
                query.status = statusVal;
            }
        }

        if (search) {
            const regex = new RegExp(escapeRegex(search), "i");
            query.$or = [
                { title: regex },
                { subject: regex },
                { examCode: regex }
            ];
        }

        if (req.user.role === "student") {
            query._id = { $in: await visibleExaminationIdsForStudent(req.user.userId) };
        }

        applyNamedDepartmentScope(query, await departmentScope(req));

        const { page, limit, skip } = parsePagination(req.query);

        const [exams, total] = await Promise.all([
            populateExamination(
                Exam.find(query)
                    .sort({ examDate: 1, startDate: 1 })
                    .skip(skip)
                    .limit(limit)
            ).populate("createdBy", creatorFieldsFor(req.user.role)),
            Exam.countDocuments(query)
        ]);

        res.status(200).json({
            exams,
            ...paginationMeta({ page, limit, total })
        });
    } catch (error) {
        console.error("Get exams error:", error.message);

        if (error.status) {
            return res.status(error.status).json({ message: error.message });
        }

        res.status(500).json({
            message: "Server error while fetching exams"
        });
    }
};

const getExamById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid exam ID"
            });
        }

        const exam = await populateExamination(
            Exam.findOne({
                _id: id,
                isArchived: false
            })
        ).populate(
            "createdBy",
            creatorFieldsFor(req.user.role)
        );

        if (!exam) {
            return res.status(404).json({
                message: "Exam not found"
            });
        }

        if (req.user.role === "student") {
            const allowed = await studentCanViewExamination(req.user.userId, exam._id);
            if (!allowed) {
                return res.status(403).json({ message: "Access denied" });
            }
        }

        const scope = await departmentScope(req);
        if (scope) {
            const ownsRef = exam.departmentRef && String(exam.departmentRef._id || exam.departmentRef) === String(scope._id);
            const ownsName = exam.department === scope.name;
            if (!ownsRef && !ownsName) {
                assertDepartment(scope, null);
            }
        }

        res.status(200).json({
            exam
        });
    } catch (error) {
        console.error("Get exam error:", error.message);

        if (error.status) {
            return res.status(error.status).json({ message: error.message });
        }

        res.status(500).json({
            message: "Server error while fetching exam"
        });
    }
};

const updateExam = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid exam ID"
            });
        }

        const allowedFields = [
            "title",
            "subject",
            "department",
            "program",
            "semester",
            "academicYear",
            "examCode",
            "examDate",
            "date",
            "startTime",
            "endTime",
            "venue",
            "room",
            "duration",
            "instructions",
            "status",
            "examType",
            "startDate",
            "endDate",
            "reportingTime",
            "sessions",
            "eligibleBatches",
            "departmentRef",
            "programRef",
            "academicYearRef"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (updates.date && !updates.examDate) {
            updates.examDate = updates.date;
            delete updates.date;
        }

        if (updates.semester !== undefined) {
            const normalizedSemester =
                parseSemester(updates.semester);

            if (
                normalizedSemester === null ||
                normalizedSemester < 1 ||
                normalizedSemester > 12
            ) {
                return res.status(400).json({
                    message:
                        "Semester must be between 1 and 12"
                });
            }

            updates.semester = normalizedSemester;
        }

        if (updates.duration !== undefined) {
            const normalizedDuration =
                parseDuration(updates.duration);

            if (
                normalizedDuration === null ||
                normalizedDuration < 1
            ) {
                return res.status(400).json({
                    message:
                        "Duration must be greater than 0"
                });
            }

            updates.duration = normalizedDuration;
        }

        if (updates.status) {
            updates.status =
                normalizeStatus(updates.status);

            if (!EXAM_STATUSES.includes(updates.status)) {
                return res.status(400).json({
                    message: "Invalid exam status"
                });
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message:
                    "No valid fields provided for update"
            });
        }

        const exam = await Exam.findOneAndUpdate(
            {
                _id: id,
                isArchived: false
            },
            updates,
            {
                new: true,
                runValidators: true
            }
        ).populate(
            "createdBy",
            "name email role"
        );

        if (!exam) {
            return res.status(404).json({
                message: "Exam not found"
            });
        }

        await logActivity({
            user: req.user.userId,
            action: "UPDATE",
            entity: "Exam",
            entityId: exam._id,
            description: `Updated exam ${exam.title}`,
            ipAddress: req.ip
        });

        res.status(200).json({
            message: "Exam updated successfully",
            exam
        });
    } catch (error) {
        console.error("Update exam error:", error);

        res.status(500).json({
            message: "Server error while updating exam"
        });
    }
};

const deleteExam = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid exam ID"
            });
        }

        const exam = await Exam.findOneAndUpdate(
            {
                _id: id,
                isArchived: false
            },
            {
                isArchived: true
            },
            {
                new: true
            }
        );

        if (!exam) {
            return res.status(404).json({
                message: "Exam not found"
            });
        }

        await logActivity({
            user: req.user.userId,
            action: "ARCHIVE",
            entity: "Exam",
            entityId: exam._id,
            description: `Archived exam ${exam.title}`,
            ipAddress: req.ip
        });

        res.status(200).json({
            message: "Exam archived successfully"
        });
    } catch (error) {
        console.error("Archive exam error:", error);

        res.status(500).json({
            message:
                "Server error while archiving exam"
        });
    }
};

module.exports = {
    createExam,
    getAllExams,
    getExamById,
    updateExam,
    deleteExam
};