import { get, post, put, patch, del } from "./api";

const withId = (record) => {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return record;
  }

  const id = record.id || record._id;
  const next = id ? { ...record, id: String(id) } : { ...record };

  Object.keys(next).forEach((key) => {
    const value = next[key];
    if (value && typeof value === "object" && !Array.isArray(value) && (value._id || value.id)) {
      next[key] = withId(value);
    }
    if (Array.isArray(value)) {
      next[key] = value.map((item) => (
        item && typeof item === "object" ? withId(item) : item
      ));
    }
  });

  return next;
};

export const createResourceService = (path) => ({
  async list(params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "" && value !== "All") {
        search.append(key, value);
      }
    });
    const query = search.toString();
    const response = await get(`${path}${query ? `?${query}` : ""}`);
    const items = Array.isArray(response.items) ? response.items.map(withId) : [];

    return {
      success: true,
      data: {
        items,
        total: response.total ?? items.length,
        page: response.page ?? 1,
        totalPages: response.totalPages ?? 1,
        counts: response.counts,
      },
      message: response.message || "",
      raw: response,
    };
  },

  async get(id) {
    const response = await get(`${path}/${id}`);
    return {
      success: true,
      data: withId(response.item),
      allocations: Array.isArray(response.allocations) ? response.allocations.map(withId) : [],
      message: response.message || "",
    };
  },

  async create(body) {
    const response = await post(path, body);
    return {
      success: true,
      data: withId(response.item || response.exam),
      message: response.message || "Saved",
      raw: response,
    };
  },

  async update(id, body) {
    const response = await put(`${path}/${id}`, body);
    return {
      success: true,
      data: withId(response.item),
      message: response.message || "Updated",
      raw: response,
    };
  },

  async patch(id, body, suffix = "") {
    const response = await patch(`${path}/${id}${suffix}`, body);
    return {
      success: true,
      data: withId(response.item),
      message: response.message || "Updated",
    };
  },

  async remove(id) {
    const response = await del(`${path}/${id}`);
    return { success: true, message: response.message || "Deleted" };
  },

  async postAction(suffix, body) {
    const response = await post(`${path}${suffix}`, body);
    return { success: true, raw: response, message: response.message || "" };
  },
});

export const academicYearService = createResourceService("/academic-years");
export const departmentService = createResourceService("/departments");
export const programService = createResourceService("/programs");
export const batchService = createResourceService("/batches");
export const sectionService = createResourceService("/sections");
export const examTypeService = createResourceService("/exam-types");
export const sessionService = createResourceService("/sessions");
export const subjectService = createResourceService("/subjects");
export const enrollmentService = createResourceService("/enrollments");
export const registrationService = createResourceService("/registrations");
export const eligibilityService = {
  ...createResourceService("/eligibility"),
  async calculate(body) {
    return post("/eligibility/calculate", body);
  },
};
export const scheduleService = createResourceService("/schedules");
export const roomService = createResourceService("/rooms");

export const roomAllocationService = {
  async preview(schedule) {
    return post("/room-allocations/preview", { schedule });
  },

  async confirm(schedule) {
    return post("/room-allocations", { schedule });
  },

  async forSchedule(scheduleId) {
    return get(`/room-allocations/schedule/${scheduleId}`);
  },
};

export const facultyService = {
  async list() {
    const response = await get("/users/faculty");
    const items = Array.isArray(response.items) ? response.items.map(withId) : [];
    return { data: { items }, message: response.message || "" };
  },

  async create(body) {
    const response = await post("/users/faculty", body);
    return {
      data: withId(response.user),
      message: response.message || "Faculty account created",
    };
  },

  async assignDepartment(id, department) {
    const response = await patch(`/users/${id}/department`, { department });
    return {
      data: withId(response.user),
      message: response.message || "Department assignment saved",
    };
  },
};

export const conflictService = {
  async check(body) {
    return post("/conflicts/check", body);
  },
};

export const scheduleWorkflow = {
  async mine() {
    const response = await get("/schedules/mine");
    return Array.isArray(response.items) ? response.items.map(withId) : [];
  },
  async preview(body) {
    const response = await post("/schedules/preview", body);
    return response;
  },
};
