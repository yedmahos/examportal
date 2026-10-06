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

const ROLE_HOME = {
  student: "/student/dashboard",
  faculty: "/faculty/dashboard",
  department_admin: "/department-admin/dashboard",
  examination_cell: "/examination-cell/dashboard",
  super_admin: "/super-admin/dashboard",
  admin: "/admin/dashboard",
};

export const roleHome = (role) => ROLE_HOME[role] || "/dashboard";

const ROLE_LABELS = {
  student: "Student",
  faculty: "Faculty",
  department_admin: "Department Admin",
  examination_cell: "Examination Cell",
  super_admin: "Super Admin",
  admin: "Legacy Admin",
};

export const roleLabel = (role) => ROLE_LABELS[role] || "User";

const PROFILE_PATHS = {
  student: "/student/profile",
  faculty: "/faculty/profile",
  department_admin: "/department-admin/profile",
  examination_cell: "/examination-cell/profile",
  super_admin: "/super-admin/profile",
  admin: "/admin/profile",
};

export const profilePath = (role) => PROFILE_PATHS[role] || "/profile";

export const departmentLabel = (user) => {
  if (!user) return "";
  const ref = user.departmentRef;
  if (ref && typeof ref === "object" && (ref.name || ref.code)) {
    return ref.name || ref.code;
  }
  return user.department || "";
};
