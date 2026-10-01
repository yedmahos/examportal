// Announcement service

import { get, post, put, patch, del } from "./api";

const withId = (record) => {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return record;
  }

  const id = record.id || record._id;
  return id ? { ...record, id: String(id) } : record;
};

export const announcementService = {
  // Get announcements
  async getAll({
    search = "",
    category = "",
    priority = "",
    published,
    status = "",
    page = 1,
    limit = 10
  } = {}) {
    const params = new URLSearchParams();

    const CATEGORY_MAP = {
      Examination: "exam",
      Academic: "academic",
      Administrative: "general",
      Urgent: "important",
      General: "general",
      Result: "result",
    };

    if (search) {
      params.append("search", search);
    }

    if (category && category !== "All") {
      params.append(
        "category",
        CATEGORY_MAP[category] || String(category).toLowerCase()
      );
    }

    if (priority && priority !== "All") {
      params.append("priority", String(priority).toLowerCase());
    }

    if (published !== undefined) {
      params.append("published", String(published));
    } else if (status === "Published") {
      params.append("published", "true");
    } else if (status === "Draft") {
      params.append("published", "false");
    }

    params.append("page", page);
    params.append("limit", limit);

    const query = params.toString();

    const response = await get(
      `/announcements/all${query ? `?${query}` : ""}`
    );

    const data = response.data || response;

    return {
      success: true,
      data: {
        items: (
          data.items ||
          data.announcements ||
          (Array.isArray(data) ? data : [])
        ).map((a) => ({
          ...a,
          id: a.id || (a._id ? String(a._id) : undefined),
        })),
        total: typeof data.total === "number" ? data.total : (data.count || 0),
        page: data.page || page,
        limit: data.limit || limit,
        totalPages: data.totalPages || 1
      },
      message: response.message || ""
    };
  },

  // Get announcement
  async getById(id) {
    const response = await get(`/announcements/${id}`);
    const announcement =
      response.announcement ||
      response.data ||
      response;

    return {
      success: true,
      data: announcement && typeof announcement === "object"
        ? {
            ...announcement,
            id: announcement.id || (announcement._id ? String(announcement._id) : undefined),
          }
        : announcement,
      message: response.message || ""
    };
  },

  // Create announcement
  async create(data) {
    const CATEGORY_MAP = {
      Examination: "exam",
      Academic: "academic",
      Administrative: "general",
      Urgent: "important",
      General: "general",
      Result: "result",
    };

    const AUDIENCE_MAP = {
      "All Students": "all",
      "Students": "students",
      "Admins": "admins",
      "All": "all",
    };

    const rawAudience = data.targetAudience || data.audience || "all";

    const payload = {
      title: data.title,
      content: data.content,
      category:
        CATEGORY_MAP[data.category] ||
        (data.category ? data.category.toLowerCase() : "general"),
      priority: data.priority
        ? data.priority.toLowerCase()
        : "normal",
      targetAudience:
        AUDIENCE_MAP[rawAudience] ||
        rawAudience ||
        "all",
      publishDate: data.publishDate || null,
      expiryDate: data.expiryDate || null,
      published:
        data.published !== undefined
          ? data.published
          : data.status === "Published"
    };

    const response = await post(
      "/announcements",
      payload
    );

    return {
      success: true,
      data: withId(
        response.announcement ||
        response.data ||
        response
      ),
      message:
        response.message ||
        "Announcement created successfully"
    };
  },

  // Update announcement
  async update(id, data) {
    const CATEGORY_MAP = {
      Examination: "exam",
      Academic: "academic",
      Administrative: "general",
      Urgent: "important",
      General: "general",
      Result: "result",
    };

    const AUDIENCE_MAP = {
      "All Students": "all",
      "Students": "students",
      "Admins": "admins",
      "All": "all",
    };

    const rawAudience = data.audience || data.targetAudience || "all";

    // Send only fields the backend allows; strip frontend-only fields
    const payload = {
      title: data.title,
      content: data.content,
      category:
        CATEGORY_MAP[data.category] ||
        (data.category ? data.category.toLowerCase() : undefined),
      priority: data.priority
        ? data.priority.toLowerCase()
        : undefined,
      targetAudience:
        AUDIENCE_MAP[rawAudience] ||
        rawAudience ||
        "all",
      publishDate: data.publishDate || undefined,
      expiryDate: data.expiryDate || undefined,
      published: data.published !== undefined
        ? data.published
        : data.status === "Published"
          ? true
          : data.status === "Draft"
            ? false
            : undefined,
    };

    // Remove undefined keys so the backend whitelist filter works cleanly
    Object.keys(payload).forEach(
      (k) => payload[k] === undefined && delete payload[k]
    );

    const response = await put(
      `/announcements/${id}`,
      payload
    );

    return {
      success: true,
      data: withId(
        response.announcement ||
        response.data ||
        response
      ),
      message:
        response.message ||
        "Announcement updated successfully"
    };
  },

  // Delete announcement
  async delete(id) {
    const response = await del(
      `/announcements/${id}`
    );

    return {
      success: true,
      data:
        response.announcement ||
        response.data ||
        null,
      message:
        response.message ||
        "Announcement deleted successfully"
    };
  },

  // Publish announcement
  async publish(id) {
    const response = await patch(
      `/announcements/${id}/publish`,
      {}
    );

    return {
      success: true,
      data: withId(
        response.announcement ||
        response.data ||
        response
      ),
      message:
        response.message ||
        "Announcement published successfully"
    };
  },

  // Unpublish announcement
  async unpublish(id) {
    const response = await patch(
      `/announcements/${id}/unpublish`,
      {}
    );

    return {
      success: true,
      data: withId(
        response.announcement ||
        response.data ||
        response
      ),
      message:
        response.message ||
        "Announcement unpublished successfully"
    };
  }
};