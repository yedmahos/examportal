const User = require("../models/User");
const Department = require("../models/Department");
const Program = require("../models/Program");
const Batch = require("../models/Batch");
const Subject = require("../models/Subject");

const outside = () => {
    const error = new Error("This record is outside your department");
    error.status = 403;
    return error;
};

const departmentScope = async (req) => {
    if (req.user?.role !== "department_admin") {
        return null;
    }

    const user = await User.findById(req.user.userId).select("departmentRef");

    if (!user?.departmentRef) {
        const error = new Error("Department admin is not assigned to a department");
        error.status = 403;
        throw error;
    }

    const department = await Department.findById(user.departmentRef).select("name code");

    if (!department) {
        const error = new Error("Assigned department was not found");
        error.status = 403;
        throw error;
    }

    return department;
};

const sameId = (left, right) => String(left?._id || left || "") === String(right?._id || right || "");

const assertDepartment = (scope, departmentId) => {
    if (!scope) return;

    if (!sameId(scope._id, departmentId)) {
        throw outside();
    }
};

const ownedProgramIds = async (scope) => {
    if (!scope) return null;
    return Program.find({ department: scope._id }).distinct("_id");
};

const ownedSubjectIds = async (scope) => {
    if (!scope) return null;
    return Subject.find({ department: scope._id }).distinct("_id");
};

const ownedBatchIds = async (scope) => {
    const programIds = await ownedProgramIds(scope);
    if (!programIds) return null;
    return Batch.find({ program: { $in: programIds } }).distinct("_id");
};

const restrictToIds = (query, field, ids) => {
    if (!ids) return;

    if (query[field]) {
        const allowed = ids.some((id) => sameId(id, query[field]));
        if (!allowed) throw outside();
        return;
    }

    query[field] = { $in: ids };
};

const studentInDepartment = (student, scope) => {
    if (!scope || !student) return true;

    if (student.departmentRef && sameId(student.departmentRef, scope._id)) {
        return true;
    }

    return student.department === scope.name;
};

const applyStudentScope = (query, scope) => {
    if (!scope) return;

    const owned = {
        $or: [
            { departmentRef: scope._id },
            { department: scope.name }
        ]
    };

    if (query.$or) {
        query.$and = [{ $or: query.$or }, owned];
        delete query.$or;
        return;
    }

    query.$or = owned.$or;
};

const applyNamedDepartmentScope = (query, scope) => {
    if (!scope) return;

    const owned = {
        $or: [
            { departmentRef: scope._id },
            { department: scope.name }
        ]
    };

    if (query.$or) {
        query.$and = [{ $or: query.$or }, owned];
        delete query.$or;
        return;
    }

    query.$or = owned.$or;
};

module.exports = {
    departmentScope,
    assertDepartment,
    ownedProgramIds,
    ownedSubjectIds,
    ownedBatchIds,
    restrictToIds,
    studentInDepartment,
    applyStudentScope,
    applyNamedDepartmentScope
};
