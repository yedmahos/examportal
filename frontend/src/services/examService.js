// Exam service

import { get, post, put, del } from "./api";

export const examService = {
  // Get exams
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

    const response = await get(`/exams?${params.toString()}`);

    const data = response.data || response;

    return {
      success: true,
      data: {
        items: data.items || [],
        total: data.total || 0,
        page: data.page || page,
        limit: data.limit || limit,
        totalPages: data.totalPages || 1
      },
      message: response.message || ""
    };
  },

  // Get exam details
  async getById(id) {
    const response = await get(`/exams/${id}`);

    return {
      success: true,
      data: response.exam || response.data || response,
      message: response.message || ""
    };
  },

  // Create exam
  async create(data) {
    const payload = {
      title: data.title,
      subject: data.subject,
      department: data.department,
      program: data.program,
      semester: data.semester,
      academicYear: data.academicYear,
      examDate: data.examDate || data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      venue: data.venue,
      duration: data.duration,
      instructions: data.instructions,
      status: data.status
        ? data.status.toLowerCase()
        : "scheduled"
    };

    const response = await post("/exams", payload);

    return {
      success: true,
      data: response.exam || response.data || response,
      message: response.message || "Exam successfully scheduled"
    };
  },

  // Update exam
  async update(id, data) {
    const payload = {
      ...data
    };

    if (data.date && !data.examDate) {
      payload.examDate = data.date;
      delete payload.date;
    }

    if (data.status) {
      payload.status = data.status.toLowerCase();
    }

    const response = await put(`/exams/${id}`, payload);

    return {
      success: true,
      data: response.exam || response.data || response,
      message: response.message || "Exam updated successfully"
    };
  },

  // Delete exam
  async delete(id) {
    const response = await del(`/exams/${id}`);

    return {
      success: true,
      data: response.exam || response.data || null,
      message: response.message || "Exam removed successfully"
    };
  },

  // Archive exam
  async archive(id) {
    const response = await put(`/exams/${id}/archive`, {});

    return {
      success: true,
      data: response.exam || response.data || response,
      message: response.message || "Exam archived successfully"
    };
  }
};