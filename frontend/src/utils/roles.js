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
  super_admin: ["super_admin", "admin", "examination_cell", "department_admin", "faculty"],
  admin: ["admin", "super_admin", "examination_cell", "department_admin", "faculty"],
};

export const canAccess = (role, allowed = []) => {
  const granted = GRANTED[role] || [role];
  return allowed.some((item) => granted.includes(item));
};

export const roleHome = (role) => (
  STAFF_ROLES.includes(role) ? "/admin/dashboard" : "/dashboard"
);

export const roleLabel = (role) => {
  const labels = {
    student: "Student Portal",
    faculty: "Faculty",
    department_admin: "Department",
    examination_cell: "Examination Cell",
    super_admin: "Super Admin",
    admin: "Administration",
  };

  return labels[role] || "Portal";
};
