// Announcement service

import { get, post, put, patch, del } from "./api";

export const announcementService = {
  // Get announcements
  async getAll({
    search = "",
    category = "",
    priority = "",
    published,
    page = 1,
    limit = 10
  } = {}) {
    const params = new URLSearchParams();

    if (search) {
      params.append("search", search);
    }

    if (category && category !== "All") {
      params.append("category", category);
    }

    if (priority && priority !== "All") {
      params.append("priority", priority);
    }

    if (published !== undefined) {
      params.append("published", String(published));
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
        total: data.total || 0,
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

    return {
      success: true,
      data:
        response.announcement ||
        response.data ||
        response,
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
          : false
    };

    const response = await post(
      "/announcements",
      payload
    );

    return {
      success: true,
      data:
        response.announcement ||
        response.data ||
        response,
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
      published: data.published !== undefined ? data.published : undefined,
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
      data:
        response.announcement ||
        response.data ||
        response,
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
      data:
        response.announcement ||
        response.data ||
        response,
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
      data:
        response.announcement ||
        response.data ||
        response,
      message:
        response.message ||
        "Announcement unpublished successfully"
    };
  }
};