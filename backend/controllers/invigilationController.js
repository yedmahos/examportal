const User = require("../models/User");
const {
    previewAssignment,
    createAssignment,
    createAssignments,
    generatePreview,
    listScheduleBoard,
    listMine,
    listForFaculty,
    workload,
    updateDuty,
    cancelDuty,
    upsertAvailability,
    listAvailability,
    subjectDepartmentId,
    presentDuty
} = require("../services/invigilationService");
const { isObjectId, invalidId, handleError } = require("../utils/http");
const { departmentScope, assertDepartment } = require("../utils/departmentScope");

const sameId = (left, right) => String(left || "") === String(right || "");

const managers = new Set(["examination_cell", "super_admin", "admin"]);

const sendFailure = (res, error, label) => {
    if (error.status) {
        return res.status(error.status).json({
            message: error.message,
            ...(error.reasons ? { reasons: error.reasons } : {})
        });
    }
    return handleError(res, error, label);
};

const assertScheduleAccess = async (req, scheduleId) => {
    const scope = await departmentScope(req);
    if (!scope) return scope;
    const departmentId = await subjectDepartmentId(scheduleId);
    assertDepartment(scope, departmentId);
    return scope;
};

const preview = async (req, res) => {
    try {
        if (!isObjectId(req.body.schedule)) return invalidId(res, "schedule id");
        if (!isObjectId(req.body.room)) return invalidId(res, "room id");
        if (!isObjectId(req.body.faculty)) return invalidId(res, "faculty id");
        await assertScheduleAccess(req, req.body.schedule);
        const result = await previewAssignment({
            scheduleId: req.body.schedule,
            roomId: req.body.room,
            facultyId: req.body.faculty,
            sameDepartmentOnly: req.body.sameDepartmentOnly,
            ignoreDutyId: req.body.ignoreDutyId
        });
        res.status(200).json(result);
    } catch (error) {
        return sendFailure(res, error, "Preview invigilation error:");
    }
};

const create = async (req, res) => {
    try {
        if (!isObjectId(req.body.schedule)) return invalidId(res, "schedule id");
        if (!isObjectId(req.body.room)) return invalidId(res, "room id");
        if (!isObjectId(req.body.faculty)) return invalidId(res, "faculty id");
        const saved = await createAssignment({
            scheduleId: req.body.schedule,
            roomId: req.body.room,
            facultyId: req.body.faculty,
            userId: req.user.userId,
            sameDepartmentOnly: req.body.sameDepartmentOnly
        });
        const duty = await listForFaculty(saved.duty.faculty);
        res.status(201).json({
            message: "Invigilation duty assigned",
            item: duty.find((item) => String(item._id) === String(saved.duty._id)) || presentDuty(saved.duty),
            reasons: saved.reasons
        });
    } catch (error) {
        return sendFailure(res, error, "Create invigilation duty error:");
    }
};

const bulk = async (req, res) => {
    try {
        if (!isObjectId(req.body.schedule)) return invalidId(res, "schedule id");
        if (!Array.isArray(req.body.assignments) || req.body.assignments.length === 0) {
            return res.status(400).json({ message: "At least one assignment is required" });
        }
        const created = await createAssignments({
            scheduleId: req.body.schedule,
            assignments: req.body.assignments,
            userId: req.user.userId,
            sameDepartmentOnly: req.body.sameDepartmentOnly
        });
        res.status(201).json({
            message: "Invigilation duties assigned",
            count: created.length
        });
    } catch (error) {
        return sendFailure(res, error, "Bulk invigilation error:");
    }
};

const generate = async (req, res) => {
    try {
        if (!isObjectId(req.body.schedule)) return invalidId(res, "schedule id");
        await assertScheduleAccess(req, req.body.schedule);
        const previewResult = await generatePreview({
            scheduleId: req.body.schedule,
            sameDepartmentOnly: req.body.sameDepartmentOnly
        });
        res.status(200).json(previewResult);
    } catch (error) {
        return sendFailure(res, error, "Generate invigilation preview error:");
    }
};

const bySchedule = async (req, res) => {
    try {
        if (!isObjectId(req.params.scheduleId)) return invalidId(res, "schedule id");
        await assertScheduleAccess(req, req.params.scheduleId);
        res.status(200).json(await listScheduleBoard(req.params.scheduleId));
    } catch (error) {
        return sendFailure(res, error, "List invigilation error:");
    }
};

const mine = async (req, res) => {
    try {
        res.status(200).json({ items: await listMine(req.user.userId) });
    } catch (error) {
        return sendFailure(res, error, "My invigilation duties error:");
    }
};

const forFaculty = async (req, res) => {
    try {
        if (!isObjectId(req.params.facultyId)) return invalidId(res, "faculty id");
        if (req.user.role === "faculty" && !sameId(req.user.userId, req.params.facultyId)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const scope = await departmentScope(req);
        if (scope) {
            const faculty = await User.findById(req.params.facultyId).select("departmentRef role");
            if (!faculty || faculty.role !== "faculty") {
                return res.status(404).json({ message: "Faculty member was not found." });
            }
            assertDepartment(scope, faculty.departmentRef);
        }

        res.status(200).json({ items: await listForFaculty(req.params.facultyId) });
    } catch (error) {
        return sendFailure(res, error, "Faculty invigilation duties error:");
    }
};

const listWorkload = async (req, res) => {
    try {
        const scope = await departmentScope(req);
        const items = await workload(scope ? scope._id : null);
        res.status(200).json({ items });
    } catch (error) {
        return sendFailure(res, error, "Invigilation workload error:");
    }
};

const update = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "duty id");
        if (req.user.role === "faculty") {
            return res.status(403).json({ message: "Access denied" });
        }
        const duty = await updateDuty(req.params.id, req.body, req.user.userId);
        res.status(200).json({
            message: "Invigilation duty updated",
            item: duty?.status ? presentDuty(duty) : duty
        });
    } catch (error) {
        return sendFailure(res, error, "Update invigilation duty error:");
    }
};

const remove = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return invalidId(res, "duty id");
        await cancelDuty(req.params.id);
        res.status(200).json({ message: "Invigilation duty cancelled" });
    } catch (error) {
        return sendFailure(res, error, "Cancel invigilation duty error:");
    }
};

const saveAvailability = async (req, res) => {
    try {
        let facultyId = req.body.faculty;
        if (req.user.role === "faculty") {
            if (facultyId && !sameId(facultyId, req.user.userId)) {
                return res.status(403).json({ message: "Access denied" });
            }
            facultyId = req.user.userId;
        } else if (!managers.has(req.user.role) && req.user.role !== "examination_cell") {
            return res.status(403).json({ message: "Access denied" });
        }
        if (!isObjectId(facultyId)) return invalidId(res, "faculty id");
        if (!isObjectId(req.body.session)) return invalidId(res, "session id");
        const item = await upsertAvailability({
            facultyId,
            date: req.body.date,
            sessionId: req.body.session,
            available: req.body.available,
            reason: req.body.reason,
            notes: req.body.notes,
            userId: req.user.userId
        });
        res.status(200).json({ message: "Availability saved", item });
    } catch (error) {
        return sendFailure(res, error, "Save availability error:");
    }
};

const getAvailability = async (req, res) => {
    try {
        let facultyId = req.query.faculty;
        if (req.user.role === "faculty") facultyId = req.user.userId;
        if (facultyId && !isObjectId(facultyId)) return invalidId(res, "faculty id");
        const scope = await departmentScope(req);
        if (scope && facultyId) {
            const faculty = await User.findById(facultyId).select("departmentRef");
            assertDepartment(scope, faculty?.departmentRef);
        }
        const result = await listAvailability({ facultyId, date: req.query.date });
        res.status(200).json(result);
    } catch (error) {
        return sendFailure(res, error, "List availability error:");
    }
};

module.exports = {
    preview,
    create,
    bulk,
    generate,
    bySchedule,
    mine,
    forFaculty,
    listWorkload,
    update,
    remove,
    saveAvailability,
    getAvailability
};
