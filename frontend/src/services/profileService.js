// Profile service

import {
  get,
  put,
  getStoredUser,
  setStoredUser
} from "./api";
import { normalizeUser } from "../utils/identity";

export const profileService = {
  // Get current profile
  async getProfile() {
    const response = await get("/profile");

    const user = normalizeUser(
      response.user || response.data || response
    );

    if (user) {
      setStoredUser(user);
    }

    return {
      success: true,
      data: user,
      message: response.message || ""
    };
  },

  // Update current profile
  async updateProfile(data) {
    // Remove protected fields
    const sanitized = { ...data };

    delete sanitized.role;
    delete sanitized.status;
    delete sanitized.id;
    delete sanitized._id;
    delete sanitized.email;
    delete sanitized.designation;
    delete sanitized.author;

    const response = await put("/profile", sanitized);

    const user = normalizeUser(
      response.user || response.data || response
    );

    if (user) {
      setStoredUser(user);
    }

    return {
      success: true,
      data: user,
      message:
        response.message ||
        "Profile updated successfully"
    };
  },

  // Get cached profile
  getCachedProfile() {
    return getStoredUser();
  }
};