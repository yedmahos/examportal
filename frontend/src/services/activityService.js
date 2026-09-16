// Activity service

import { get, post } from "./api";

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

  // Create activity log
  async log(
    action,
    entity,
    description,
    actor = "System Admin",
    type = "system"
  ) {
    const response = await post("/activities", {
      action,
      entity,
      description,
      actor,
      type
    });

    return {
      success: true,
      data:
        response.activity ||
        response.data ||
        response,
      message:
        response.message ||
        "Activity logged successfully"
    };
  }
};