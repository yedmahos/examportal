// Activity service

import { get } from "./api";

export const activityService = {
  // Get activity logs
  async getAll({ limit = 20 } = {}) {
    const params = new URLSearchParams();

    params.append("limit", limit);

    const response = await get(`/activities?${params.toString()}`);

    const data = response.data || response;

    const items =
      data.items ||
      data.activities ||
      (Array.isArray(data) ? data : []);

    return {
      success: true,
      data: items,
      message: response.message || ""
    };
  },

  // Activity rows are written by backend controllers.
  // This method stays as a no-op so a missed call cannot fail a successful save.
  async log() {
    return {
      success: true,
      data: null,
      message: "Activity is recorded by the server"
    };
  }
};