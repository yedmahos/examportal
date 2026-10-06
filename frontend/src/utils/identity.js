export const normalizeUser = (raw) => {
  if (!raw || typeof raw !== "object") return null;

  const source = raw.user && !raw.email ? raw.user : raw;
  if (!source || typeof source !== "object" || (!source.email && !source.role)) {
    return null;
  }

  const ref = source.departmentRef;
  let departmentRef = null;
  if (ref && typeof ref === "object") {
    const id = ref.id || ref._id;
    if (id) {
      departmentRef = {
        id: String(id),
        name: ref.name || "",
        code: ref.code || "",
      };
    }
  } else if (typeof ref === "string" && ref) {
    departmentRef = { id: ref, name: "", code: "" };
  }

  return {
    id: String(source.id || source._id || ""),
    name: source.name || "",
    email: source.email || "",
    role: source.role || "",
    status: source.status || "",
    studentId: source.studentId || "",
    department: source.department || departmentRef?.name || "",
    departmentRef,
    program: source.program || "",
    semester: source.semester ?? null,
    academicYear: source.academicYear || "",
    phone: source.phone || "",
    address: source.address || "",
    profileImage: source.profileImage || "",
    gpa: source.gpa ?? null,
    creditsCompleted: source.creditsCompleted ?? null,
    totalCredits: source.totalCredits ?? null,
    academicStanding: source.academicStanding || "",
  };
};
