export const STAFF_ROLES = [
  "admin",
  "super_admin",
  "examination_cell",
  "department_admin",
  "faculty",
];

const GRANTED = {
  student: ["student"],
  faculty: ["faculty"],
  department_admin: ["department_admin"],
  examination_cell: ["examination_cell"],
  super_admin: ["super_admin", "examination_cell", "department_admin", "faculty", "admin"],
  admin: ["admin", "super_admin", "examination_cell", "department_admin", "faculty"],
};

export const canAccess = (role, allowed = []) => {
  const granted = GRANTED[role] || [role];
  return allowed.some((item) => granted.includes(item));
};

const ROLE_BASE = {
  student: "/student",
  faculty: "/faculty",
  department_admin: "/department-admin",
  examination_cell: "/examination-cell",
  super_admin: "/super-admin",
  admin: "/super-admin",
};

export const roleBase = (role) => ROLE_BASE[role] || "/admin";

export const roleHome = (role) => `${roleBase(role)}/dashboard`;

export const roleLabel = (role) => {
  const labels = {
    student: "Student",
    faculty: "Faculty",
    department_admin: "Department Admin",
    examination_cell: "Examination Cell",
    super_admin: "Super Admin",
    admin: "Legacy Admin",
  };

  return labels[role] || "Portal";
};
