export const demoSignInEnabled = import.meta.env.DEV;

export const demoAccounts = import.meta.env.DEV
  ? [
    {
      key: "student",
      label: "Student",
      email: "student@example.com",
      password: "Student@12345"
    },
    {
      key: "faculty",
      label: "Faculty",
      email: "faculty@example.com",
      password: "Faculty@12345"
    },
    {
      key: "department_admin",
      label: "Department Admin",
      email: "department.admin@example.com",
      password: "DepartmentAdmin@12345"
    },
    {
      key: "examination_cell",
      label: "Examination Cell",
      email: "examination.cell@example.com",
      password: "ExaminationCell@12345"
    },
    {
      key: "super_admin",
      label: "Super Admin",
      email: "super.admin@example.com",
      password: "SuperAdmin@12345"
    }
  ]
  : [
    { key: "student", label: "Student", email: "student@example.com" },
    { key: "faculty", label: "Faculty", email: "faculty@example.com" },
    { key: "department_admin", label: "Department Admin", email: "department.admin@example.com" },
    { key: "examination_cell", label: "Examination Cell", email: "examination.cell@example.com" },
    { key: "super_admin", label: "Super Admin", email: "super.admin@example.com" }
  ];
