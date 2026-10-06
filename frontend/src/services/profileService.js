// Profile service

import {
  get,
  put,
  getStoredUser,
  setStoredUser
} from "./api";
import { normalizeUser } from "../utils/identity";
import { departmentService } from "./resourceService";

const withDepartment = async (user) => {
  if (!user?.departmentRef?.id || user.department || user.departmentRef.name) {
    return user;
  }

  const canReadDepartment = [
    "department_admin",
    "examination_cell",
    "super_admin",
    "admin"
  ].includes(user.role);

  if (!canReadDepartment) return user;

  try {
    const department = await departmentService.get(user.departmentRef.id);
    const name = department.data?.name || "";
    const code = department.data?.code || "";
    if (!name && !code) return user;

    return {
      ...user,
      department: name,
      departmentRef: {
        ...user.departmentRef,
        name,
        code
      }
    };
  } catch {
    return user;
  }
};

export const profileService = {
  // Get current profile
  async getProfile() {
    const response = await get("/profile");

    const user = await withDepartment(normalizeUser(
      response.user || response.data || response
    ));

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

    const user = await withDepartment(normalizeUser(
      response.user || response.data || response
    ));

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