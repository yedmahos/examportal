const ROLES = {
    STUDENT: "student",
    FACULTY: "faculty",
    DEPARTMENT_ADMIN: "department_admin",
    EXAMINATION_CELL: "examination_cell",
    SUPER_ADMIN: "super_admin",
    ADMIN: "admin"
};

const ALL_ROLES = Object.values(ROLES);

const ASSIGNABLE_ROLES = [
    ROLES.FACULTY,
    ROLES.DEPARTMENT_ADMIN,
    ROLES.EXAMINATION_CELL,
    ROLES.SUPER_ADMIN
];

const STAFF_ROLES = [
    ROLES.FACULTY,
    ROLES.DEPARTMENT_ADMIN,
    ROLES.EXAMINATION_CELL,
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN
];

// Each PRD role keeps only its own permission.
// Super Admin is the full-access role, so it also satisfies the narrower roles.
// Legacy "admin" is not an organizational role. Unmigrated accounts keep the
// same access as Super Admin until an explicit mapping script is applied.
// New routes must name the PRD roles. They must not authorize("admin") alone.
const GRANTED = {
    student: [ROLES.STUDENT],
    faculty: [ROLES.FACULTY],
    department_admin: [ROLES.DEPARTMENT_ADMIN],
    examination_cell: [ROLES.EXAMINATION_CELL],
    super_admin: [
        ROLES.SUPER_ADMIN,
        ROLES.EXAMINATION_CELL,
        ROLES.DEPARTMENT_ADMIN,
        ROLES.FACULTY,
        ROLES.ADMIN
    ],
    admin: [
        ROLES.ADMIN,
        ROLES.SUPER_ADMIN,
        ROLES.EXAMINATION_CELL,
        ROLES.DEPARTMENT_ADMIN,
        ROLES.FACULTY
    ]
};

const GROUPS = {
    examManagers: [ROLES.EXAMINATION_CELL, ROLES.SUPER_ADMIN],
    departmentReaders: [ROLES.EXAMINATION_CELL, ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN],
    systemWriters: [ROLES.SUPER_ADMIN],
    studentManagers: [ROLES.EXAMINATION_CELL, ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN],
    resultManagers: [ROLES.EXAMINATION_CELL, ROLES.SUPER_ADMIN],
    announcementManagers: [ROLES.EXAMINATION_CELL, ROLES.SUPER_ADMIN],
    staffDashboard: [
        ROLES.SUPER_ADMIN,
        ROLES.EXAMINATION_CELL,
        ROLES.DEPARTMENT_ADMIN,
        ROLES.FACULTY
    ]
};

const roleSatisfies = (userRole, allowedRoles) => {
    const granted = GRANTED[userRole] || [userRole];
    return allowedRoles.some((role) => granted.includes(role));
};

const isStaffRole = (role) => STAFF_ROLES.includes(role);

module.exports = {
    ROLES,
    ALL_ROLES,
    ASSIGNABLE_ROLES,
    STAFF_ROLES,
    GROUPS,
    roleSatisfies,
    isStaffRole
};
