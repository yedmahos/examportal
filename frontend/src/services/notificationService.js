// Notification service

import { get, patch, del } from "./api";

export const notificationService = {
  // Get notifications
  async getAll({ type = "All", isRead } = {}) {
    const params = new URLSearchParams();

    if (type && type !== "All" && type !== "All Updates") {
      params.append("type", type);
    }

    if (isRead !== undefined) {
      params.append("isRead", String(isRead));
    }

    const query = params.toString();

    const response = await get(
      `/notifications${query ? `?${query}` : ""}`
    );

    const notifications = response.notifications ||
      response.data?.notifications ||
      response.data ||
      [];

    let items = (Array.isArray(notifications) ? notifications : []).map(
      (notification) => ({
        ...notification,
        id: notification.id || notification._id,
      })
    );

    const typeMap = {
      Exams: "exam",
      Results: "result",
      Announcements: "announcement",
      exam: "exam",
      result: "result",
      announcement: "announcement",
    };

    const requestedType = typeMap[type];

    if (requestedType) {
      items = items.filter(
        (notification) => notification.type === requestedType
      );
    }

    if (isRead !== undefined) {
      const readFlag = isRead === true || isRead === "true";
      items = items.filter(
        (notification) => Boolean(notification.isRead) === readFlag
      );
    }

    const unreadCount = typeof response.unreadCount === "number" &&
      !requestedType &&
      isRead === undefined
      ? response.unreadCount
      : items.filter((notification) => !notification.isRead).length;

    return {
      success: true,
      data: {
        items,
        total: items.length,
        unreadCount
      },
      message: response.message || ""
    };
  },

  // Mark notification read
  async markAsRead(id) {
    const response = await patch(
      `/notifications/${id}/read`
    );

    return {
      success: true,
      data:
        response.notification ||
        response.data ||
        response,
      message: response.message || "Notification marked as read"
    };
  },

  // Mark all notifications read
  async markAllAsRead() {
    const response = await patch(
      "/notifications/read-all"
    );

    return {
      success: true,
      data:
        response.notifications ||
        response.data ||
        response,
      message:
        response.message ||
        "All notifications marked as read"
    };
  },

  // Delete notification
  async delete(id) {
    const response = await del(`/notifications/${id}`);

    return {
      success: true,
      data: response.notification || response.data || null,
      message: response.message || "Notification deleted successfully"
    };
  }
};