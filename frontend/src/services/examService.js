// Exam service

import { get, post, put, del } from "./api";

const toApiExamStatus = (value) => {
  if (!value) {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (
    normalized === "in progress" ||
    normalized === "in-progress" ||
    normalized === "inprogress"
  ) {
    return "ongoing";
  }

  return normalized;
};

const withId = (exam) => {
  if (!exam || typeof exam !== "object") {
    return exam;
  }

  const id = exam.id || exam._id;

  return id ? { ...exam, id: String(id) } : exam;
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
      params.append("status", toApiExamStatus(status));
    }

    params.append("page", page);
    params.append("limit", limit);

    const response = await get(`/exams?${params.toString()}`);

    const data = response.data || response;

    const rawItems = data.exams || data.items || [];
    const normalizedItems = rawItems.map(withId);

    return {
      success: true,
      data: {
        items: normalizedItems,
        total: totalFrom(data, normalizedItems.length),
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
      data: withId(response.exam || response.data || response),
      message: response.message || ""
    };
  },

  // Create exam
  async create(data) {
    const payload = {
      title: data.title,
      subject: data.subject,
      examCode: data.examCode,
      room: data.room,
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
        ? toApiExamStatus(data.status)
        : "scheduled"
    };

    const response = await post("/exams", payload);

    return {
      success: true,
      data: withId(response.exam || response.data || response),
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
      payload.status = toApiExamStatus(data.status);
    }

    delete payload.totalMarks;
    delete payload.passingMarks;
    delete payload.credits;
    delete payload.invigilator;
    delete payload.id;
    delete payload._id;

    const response = await put(`/exams/${id}`, payload);

    return {
      success: true,
      data: withId(response.exam || response.data || response),
      message: response.message || "Exam updated successfully"
    };
  },

  // Delete exam (backend archives the document)
  async createSetup(data) {
    const response = await post("/exams", {
      examinationSetup: true,
      ...data,
    });

    return {
      success: true,
      data: withId(response.exam || response.data || response),
      message: response.message || "Examination created"
    };
  },

  async delete(id) {
    const response = await del(`/exams/${id}`);

    return {
      success: true,
      data: response.exam || response.data || null,
      message: response.message || "Exam removed successfully"
    };
  }
};