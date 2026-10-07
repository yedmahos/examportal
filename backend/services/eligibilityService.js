const Exam = require("../models/Exam");
const Subject = require("../models/Subject");
const Enrollment = require("../models/Enrollment");
const SubjectRegistration = require("../models/SubjectRegistration");
const ExamEligibility = require("../models/ExamEligibility");
const Schedule = require("../models/Schedule");
const { isObjectId } = require("../utils/http");

const fail = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const calculateEligibility = async ({ examinationId, subjectId }) => {
    if (!isObjectId(examinationId) || !isObjectId(subjectId)) {
        throw fail(400, "Valid examination and subject are required");
    }

    const examination = await Exam.findOne({
        _id: examinationId,
        isArchived: false
    });

    if (!examination) {
        throw fail(404, "Examination not found");
    }

    const subject = await Subject.findById(subjectId);

    if (!subject) {
        throw fail(404, "Subject not found");
    }

    if (!examination.programRef && !(examination.eligibleBatches || []).length) {
        throw fail(
            400,
            "Examination needs a program or eligible batches before eligibility can be calculated"
        );
    }

    const enrollmentQuery = {
        status: "active",
        semester: examination.semester
    };

    if (examination.programRef) {
        enrollmentQuery.program = examination.programRef;
    }

    if (examination.academicYearRef) {
        enrollmentQuery.academicYear = examination.academicYearRef;
    }

    if ((examination.eligibleBatches || []).length) {
        enrollmentQuery.batch = { $in: examination.eligibleBatches };
    }

    const enrollments = await Enrollment.find(enrollmentQuery);
    const enrolledByStudent = new Map(
        enrollments.map((enrollment) => [String(enrollment.student), enrollment])
    );

    const registrationQuery = {
        subject: subject._id,
        semester: examination.semester
    };

    if (examination.academicYearRef) {
        registrationQuery.academicYear = examination.academicYearRef;
    }

    const registrations = await SubjectRegistration.find(registrationQuery);
    const registrationByStudent = new Map(
        registrations.map((registration) => [String(registration.student), registration])
    );

    const studentIds = new Set([
        ...enrolledByStudent.keys(),
        ...registrationByStudent.keys()
    ]);

    const keptStudents = [];

    for (const studentId of studentIds) {
        const enrollment = enrolledByStudent.get(studentId);
        const registration = registrationByStudent.get(studentId);
        const existing = await ExamEligibility.findOne({
            student: studentId,
            examination: examination._id,
            subject: subject._id
        });
        const reasons = [];

        let attendanceStatus = existing?.attendanceStatus || "unknown";
        let academicStatus = existing?.academicStatus || "unknown";
        let backlogStatus = existing?.backlogStatus || "none";
        let examRegistrationStatus = "not_registered";
        let eligibilityStatus = "eligible";

        if (!enrollment) {
            reasons.push("Student is not enrolled in an eligible batch for this examination");
        }

        if (!registration || registration.registrationStatus === "dropped") {
            examRegistrationStatus = "not_registered";
            reasons.push("Student is not registered for this subject");
        } else if (registration.registrationStatus === "pending") {
            examRegistrationStatus = "pending";
            eligibilityStatus = "eligible";
        } else if (registration.registrationStatus === "registered") {
            examRegistrationStatus = "registered";
            eligibilityStatus = "registered";
        }

        if (attendanceStatus === "short") {
            reasons.push("Attendance is short");
        }

        if (academicStatus === "detained") {
            reasons.push("Academic status is detained");
        }

        if (backlogStatus === "backlog") {
            reasons.push("Backlog is unresolved");
        }

        if (reasons.length) {
            eligibilityStatus = "blocked";
        }

        const record = await ExamEligibility.findOneAndUpdate(
            {
                student: studentId,
                examination: examination._id,
                subject: subject._id
            },
            {
                student: studentId,
                examination: examination._id,
                subject: subject._id,
                eligibilityStatus,
                attendanceStatus,
                academicStatus,
                examRegistrationStatus,
                backlogStatus,
                reason: reasons.join(". ")
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true
            }
        );

        keptStudents.push(record.student);
    }

    await ExamEligibility.deleteMany({
        examination: examination._id,
        subject: subject._id,
        student: { $nin: keptStudents }
    });

    const records = await ExamEligibility.find({
        examination: examination._id,
        subject: subject._id
    }).populate("student", "name studentId email");

    return {
        examination: examination._id,
        subject: subject._id,
        counts: {
            eligible: records.filter((item) => item.eligibilityStatus === "eligible").length,
            registered: records.filter((item) => item.eligibilityStatus === "registered").length,
            blocked: records.filter((item) => item.eligibilityStatus === "blocked").length
        },
        records
    };
};

const VISIBLE_ELIGIBILITY_STATUSES = ["eligible", "registered"];

const scheduleEligibilityQuery = (studentId, examinationId, subjectId) => {
    const query = {
        student: studentId,
        eligibilityStatus: { $in: VISIBLE_ELIGIBILITY_STATUSES }
    };

    if (examinationId) query.examination = examinationId;
    if (subjectId) query.subject = subjectId;

    return query;
};

const studentCanViewExamination = async (studentId, examinationId, subjectId) => {
    if (!studentId || !examinationId) return false;

    return Boolean(await ExamEligibility.exists(
        scheduleEligibilityQuery(studentId, examinationId, subjectId)
    ));
};

// Same student scope as My Schedule: a scheduled paper that still
// lists this student and keeps an eligible or registered row.
const schedulesVisibleToStudent = async (studentId) => {
    const schedules = await Schedule.find({
        eligibleStudents: studentId,
        status: "scheduled"
    }).sort({ date: 1 });

    const visible = [];

    for (const schedule of schedules) {
        const allowed = await studentCanViewExamination(
            studentId,
            schedule.examination,
            schedule.subject
        );

        if (allowed) visible.push(schedule);
    }

    return visible;
};

const visibleExaminationIdsForStudent = async (studentId) => {
    const schedules = await schedulesVisibleToStudent(studentId);
    return [...new Set(schedules.map((schedule) => String(schedule.examination)))];
};

const eligibleStudentIds = async ({ examinationId, subjectId }) => {
    const records = await ExamEligibility.find({
        examination: examinationId,
        subject: subjectId,
        eligibilityStatus: { $in: VISIBLE_ELIGIBILITY_STATUSES }
    }).select("student");

    return records.map((record) => record.student);
};

const snapshotEligibleStudentIds = async ({ examinationId, subjectId }) => {
    await calculateEligibility({ examinationId, subjectId });
    return eligibleStudentIds({ examinationId, subjectId });
};

module.exports = {
    VISIBLE_ELIGIBILITY_STATUSES,
    calculateEligibility,
    eligibleStudentIds,
    snapshotEligibleStudentIds,
    visibleExaminationIdsForStudent,
    studentCanViewExamination,
    schedulesVisibleToStudent
};
