const presentDepartment = (departmentRef) => {
    if (!departmentRef) return null;

    const id = departmentRef._id || departmentRef.id || departmentRef;
    const name = departmentRef.name || "";
    const code = departmentRef.code || "";

    return {
        id,
        name,
        code
    };
};

const presentUser = (user) => {
    const departmentRef = presentDepartment(user.departmentRef);
    const departmentName = departmentRef && departmentRef.name
        ? departmentRef.name
        : "";

    return {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        studentId: user.studentId || null,
        department: user.department || departmentName,
        departmentRef,
        program: user.program || "",
        semester: user.semester ?? null,
        academicYear: user.academicYear || "",
        phone: user.phone || "",
        address: user.address || "",
        profileImage: user.profileImage || "",
        gpa: user.gpa ?? null,
        creditsCompleted: user.creditsCompleted ?? null,
        totalCredits: user.totalCredits ?? null,
        academicStanding: user.academicStanding || ""
    };
};

module.exports = { presentUser };
