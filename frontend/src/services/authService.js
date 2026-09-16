// Authentication service

import {
  post,
  getAuthToken,
  setAuthToken,
  clearAuth,
  getStoredUser,
  setStoredUser
} from "./api";

export const authService = {
  // Login user
  async login(email, password) {
    const response = await post("/auth/login", {
      email: email.trim().toLowerCase(),
      password
    });

    const data = response.data || response;

    const token = data.token;
    const user = data.user;

    if (!token) {
      throw new Error(
        response.message ||
        "Login response did not contain a token"
      );
    }

    setAuthToken(token);

    if (user) {
      setStoredUser(user);
    }

    return {
      success: true,
      data: {
        user,
        token
      },
      message:
        response.message ||
        "Login successful"
    };
  },

  // Register student
  async register(formData) {
    const response = await post("/auth/register", {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      studentId: formData.studentId,
      department: formData.department,
      program: formData.program,
      semester: formData.semester,
      academicYear: formData.academicYear,
      phone: formData.phone
    });

    const data = response.data || response;

    const token = data.token;
    const user = data.user;

    if (!token) {
      throw new Error(
        response.message ||
        "Registration response did not contain a token"
      );
    }

    setAuthToken(token);

    if (user) {
      setStoredUser(user);
    }

    return {
      success: true,
      data: {
        user,
        token
      },
      message:
        response.message ||
        "Registration successful"
    };
  },

  // Get cached user
  getStoredUser() {
    return getStoredUser();
  },

  // Check authentication
  isAuthenticated() {
    return Boolean(getAuthToken());
  },

  // Update cached user
  updateStoredUser(user) {
    setStoredUser(user);
  },

  // Logout user
  async logout() {
    clearAuth();

    return {
      success: true,
      data: null,
      message: "Logged out successfully"
    };
  }
};