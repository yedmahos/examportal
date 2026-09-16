// Announcement service

import { get, post, put, del } from "./api";

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
      `/announcements${query ? `?${query}` : ""}`
    );

    const data = response.data || response;

    return {
      success: true,
      data: {
        items:
          data.items ||
          data.announcements ||
          (Array.isArray(data) ? data : []),
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
    const payload = {
      title: data.title,
      content: data.content,
      category: data.category
        ? data.category.toLowerCase()
        : "general",
      priority: data.priority
        ? data.priority.toLowerCase()
        : "normal",
      targetAudience:
        data.targetAudience || "all",
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
    const payload = {
      ...data
    };

    if (payload.category) {
      payload.category = payload.category.toLowerCase();
    }

    if (payload.priority) {
      payload.priority = payload.priority.toLowerCase();
    }

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
    const response = await put(
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
    const response = await put(
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