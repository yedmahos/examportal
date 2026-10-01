// Result service

import { get, post, put, patch, del } from "./api";

const withId = (record) => {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return record;
  }

  const id = record.id || record._id;

  return id
    ? { ...record, id: String(id) }
    : record;
};

const totalFrom = (data, fallback = 0) => {
  if (typeof data?.total === "number") {
    return data.total;
  }

  if (typeof data?.count === "number") {
    return data.count;
  }

  return fallback;
};

export const resultService = {
  // Get results
  async getAll({
    search = "",
    department = "",
    semester = "",
    status = "",
    studentId = "",
    student = "",
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

    if (student) {
      params.append("student", student);
    }

    params.append("page", page);
    params.append("limit", limit);

    const response = await get(`/results?${params.toString()}`);

    const data = response.data || response;
    const items = (data.items || data.results || []).map(withId);

    return {
      success: true,
      data: {
        items,
        total: totalFrom(data, items.length),
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
    const items = (data.items || data.results || []).map(withId);

    return {
      success: true,
      data: {
        items,
        total: totalFrom(data, items.length),
        totalPages: 1
      },
      message: response.message || ""
    };
  },

  // Get result details
  async getById(id) {
    const response = await get(`/results/${id}`);
    const result = withId(response.result || response.data || response);

    return {
      success: true,
      data: result,
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
      data: withId(response.result || response.data || response),
      message: response.message || "Result entry created"
    };
  },

  // Update result
  async update(id, data) {
    const payload = {};

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
      data: withId(response.result || response.data || response),
      message: response.message || "Result updated successfully"
    };
  },

  // Publish result
  async publish(id) {
    const response = await patch(`/results/${id}/publish`, {});

    return {
      success: true,
      data: withId(response.result || response.data || response),
      message:
        response.message ||
        "Result published successfully"
    };
  },

  // Unpublish result
  async unpublish(id) {
    const response = await patch(`/results/${id}/unpublish`, {});

    return {
      success: true,
      data: withId(response.result || response.data || response),
      message:
        response.message ||
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
