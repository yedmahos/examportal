const TARGETS = ["super_admin", "examination_cell", "department_admin", "faculty"];

const emptySummary = () => ({
    total: 0,
    student: 0,
    faculty: 0,
    department_admin: 0,
    examination_cell: 0,
    super_admin: 0,
    admin: 0,
    other: 0,
    legacyAdmins: [],
    departmentAdminsMissingDepartmentRef: []
});

const summarizeUsers = (users) => {
    const summary = emptySummary();
    summary.total = users.length;

    users.forEach((user) => {
        const role = user.role || "other";

        if (Object.prototype.hasOwnProperty.call(summary, role) && role !== "total") {
            summary[role] += 1;
        } else {
            summary.other += 1;
        }

        if (role === "admin") {
            summary.legacyAdmins.push({
                id: String(user._id),
                email: user.email,
                action: "explicit assignment required"
            });
        }

        if (role === "department_admin" && !user.departmentRef) {
            summary.departmentAdminsMissingDepartmentRef.push({
                id: String(user._id),
                email: user.email
            });
        }
    });

    return summary;
};

const planMigration = (users, mapping = {}) => {
    const summary = summarizeUsers(users);
    const changes = [];
    const errors = [];

    summary.legacyAdmins.forEach((admin) => {
        const target = mapping[admin.email];

        if (!target) {
            changes.push({
                email: admin.email,
                from: "admin",
                to: null,
                action: "explicit assignment required"
            });
            return;
        }

        if (!TARGETS.includes(target)) {
            errors.push(`${admin.email} cannot be mapped to ${target}`);
            return;
        }

        changes.push({
            email: admin.email,
            from: "admin",
            to: target,
            action: "map"
        });
    });

    Object.keys(mapping).forEach((email) => {
        const user = users.find((item) => item.email === email);

        if (!user) {
            errors.push(`${email} was not found`);
            return;
        }

        if (user.role !== "admin") {
            errors.push(`${email} is ${user.role} and will not be changed`);
        }
    });

    return {
        summary,
        changes,
        errors,
        deletes: 0
    };
};

module.exports = {
    TARGETS,
    summarizeUsers,
    planMigration
};
