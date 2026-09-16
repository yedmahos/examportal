// Student service

import { get, post, put, patch } from "./api";

export const studentService = {
  // Get students
  async getAll({
    search = "",
    department = "",
    semester = "",
    status = "",
    page = 1,
    limit = 10
  } = {}) {
    const params = new URLSearchParams();

    if (search) params.append("search", search);

    if (department && department !== "All") {
      params.append("department", department);
    }

    if (semester && semester !== "All") {
      params.append("semester", semester);
    }

    if (status && status !== "All") {
      params.append("status", status);
    }

    params.append("page", page);
    params.append("limit", limit);

    const response = await get(`/students?${params.toString()}`);

    const data = response.data || response;

    return {
      success: true,
      data: {
        items: data.items || data.students || [],
        total: data.total || 0,
        page: data.page || page,
        limit: data.limit || limit,
        totalPages: data.totalPages || 1
      },
      message: response.message || ""
    };
  },

  // Get student details
  async getById(id) {
    const response = await get(`/students/${id}`);

    return {
      success: true,
      data: response.student || response.data || response,
      message: response.message || ""
    };
  },

  // Update student
  async update(id, updateData) {
    const payload = { ...updateData };

    delete payload.role;
    delete payload.password;
    delete payload._id;
    delete payload.id;

    const response = await put(`/students/${id}`, payload);

    return {
      success: true,
      data: response.student || response.data || response,
      message:
        response.message ||
        "Student record updated successfully"
    };
  },

  // Toggle student status
  async toggleStatus(id) {
    const response = await patch(`/students/${id}/status`);

    return {
      success: true,
      data: response.student || response.data || response,
      message:
        response.message ||
        "Student status updated successfully"
    };
  },

  // Create student
  async create(data) {
    const payload = {
      name: data.name,
      email: data.email,
      studentId: data.studentId,
      department: data.department,
      program: data.program,
      semester: data.semester,
      academicYear: data.academicYear,
      phone: data.phone
    };

    const response = await post("/students", payload);

    return {
      success: true,
      data: response.student || response.data || response,
      message:
        response.message ||
        "Student record created successfully"
    };
  }
};