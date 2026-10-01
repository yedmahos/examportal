const ROLES = {
    STUDENT: "student",
    FACULTY: "faculty",
    DEPARTMENT_ADMIN: "department_admin",
    EXAMINATION_CELL: "examination_cell",
    SUPER_ADMIN: "super_admin",
    ADMIN: "admin"
};

const ALL_ROLES = Object.values(ROLES);

const STAFF_ROLES = [
    ROLES.FACULTY,
    ROLES.DEPARTMENT_ADMIN,
    ROLES.EXAMINATION_CELL,
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN
];

// Privileges implied by the role stored on the user.
// Legacy "admin" keeps full staff access until records are migrated.
// "super_admin" can call routes that still authorize("admin").
const GRANTED = {
    student: [ROLES.STUDENT],
    faculty: [ROLES.FACULTY],
    department_admin: [ROLES.DEPARTMENT_ADMIN],
    examination_cell: [ROLES.EXAMINATION_CELL],
    super_admin: [
        ROLES.SUPER_ADMIN,
        ROLES.ADMIN,
        ROLES.EXAMINATION_CELL,
        ROLES.DEPARTMENT_ADMIN,
        ROLES.FACULTY
    ],
    admin: [
        ROLES.ADMIN,
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
    STAFF_ROLES,
    roleSatisfies,
    isStaffRole
};
