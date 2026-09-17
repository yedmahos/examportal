// Result service

import { get, post, put, del } from "./api";

export const resultService = {
  // Get results
  async getAll({
    search = "",
    department = "",
    semester = "",
    status = "",
    studentId = "",
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

    if (studentId) {
      params.append("studentId", studentId);
    }

    params.append("page", page);
    params.append("limit", limit);

    const response = await get(`/results?${params.toString()}`);

    const data = response.data || response;

    return {
      success: true,
      data: {
        items: data.items || data.results || [],
        total: data.total || 0,
        page: data.page || page,
        limit: data.limit || limit,
        totalPages: data.totalPages || 1
      },
      message: response.message || ""
    };
  },

  // Get my results (student)
  async getMyResults() {
    const response = await get(`/results/my`);

    const data = response.data || response;

    return {
      success: true,
      data: {
        items: data.items || data.results || [],
        total: data.total || data.count || 0,
        totalPages: 1 // My results doesn't have pagination yet
      },
      message: response.message || ""
    };
  },

  // Get result details
  async getById(id) {
    const response = await get(`/results/${id}`);

    return {
      success: true,
      data: response.result || response.data || response,
      message: response.message || ""
    };
  },

  // Create result
  async create(data) {
    const payload = {
      student: data.student || data.studentId,
      exam: data.exam || data.examId,
      marksObtained:
        data.marksObtained !== undefined
          ? Number(data.marksObtained)
          : Number(data.marks || 0),
      maximumMarks:
        data.maximumMarks !== undefined
          ? Number(data.maximumMarks)
          : Number(data.maxMarks || 100)
    };

    const response = await post("/results", payload);

    return {
      success: true,
      data: response.result || response.data || response,
      message: response.message || "Result entry created"
    };
  },

  // Update result
  async update(id, data) {
    const payload = {};

    if (data.student !== undefined) {
      payload.student = data.student;
    } else if (data.studentId !== undefined) {
      payload.student = data.studentId;
    }

    if (data.exam !== undefined) {
      payload.exam = data.exam;
    } else if (data.examId !== undefined) {
      payload.exam = data.examId;
    }

    if (data.marksObtained !== undefined) {
      payload.marksObtained = Number(data.marksObtained);
    } else if (data.marks !== undefined) {
      payload.marksObtained = Number(data.marks);
    }

    if (data.maximumMarks !== undefined) {
      payload.maximumMarks = Number(data.maximumMarks);
    } else if (data.maxMarks !== undefined) {
      payload.maximumMarks = Number(data.maxMarks);
    }

    const response = await put(`/results/${id}`, payload);

    return {
      success: true,
      data: response.result || response.data || response,
      message: response.message || "Result updated successfully"
    };
  },

  // Publish result
  async publish(id) {
    const response = await put(`/results/${id}/publish`, {});

    return {
      success: true,
      data: response.result || response.data || response,
      message:
        response.message ||
        "Result published successfully"
    };
  },

  // Unpublish result
  async unpublish(id) {
    const response = put
      ? await put(`/results/${id}/unpublish`, {})
      : null;

    return {
      success: true,
      data: response?.result || response?.data || response,
      message:
        response?.message ||
        "Result unpublished successfully"
    };
  },

  // Delete result
  async delete(id) {
    const response = await del(`/results/${id}`);

    return {
      success: true,
      data: response.result || response.data || null,
      message: response.message || "Result deleted successfully"
    };
  }
};