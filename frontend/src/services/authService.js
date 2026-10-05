// Authentication service

import {
  get,
  post,
  getAuthToken,
  setAuthToken,
  clearAuth,
  getStoredUser,
  setStoredUser
} from "./api";

const storedUser = (user) => {
  if (!user) return null;

  return {
    id: user.id || user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    studentId: user.studentId,
    department: user.department,
    departmentRef: user.departmentRef || null,
    program: user.program,
    semester: user.semester,
    academicYear: user.academicYear,
    phone: user.phone
  };
};

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

    const sessionUser = storedUser(user);

    if (sessionUser) {
      setStoredUser(sessionUser);
    }

    return {
      success: true,
      data: {
        user: sessionUser,
        token
      },
      message:
        response.message ||
        "Login successful"
    };
  },

  async restoreSession() {
    if (!getAuthToken()) return null;

    try {
      const response = await get("/profile");
      const sessionUser = storedUser(response.user);

      if (!sessionUser?.role) {
        clearAuth();
        return null;
      }

      setStoredUser(sessionUser);
      return sessionUser;
    } catch {
      clearAuth();
      return null;
    }
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

    const sessionUser = storedUser(user);

    if (sessionUser) {
      setStoredUser(sessionUser);
    }

    return {
      success: true,
      data: {
        user: sessionUser,
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