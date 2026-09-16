// API configuration
const API_BASE_URL =
    import.meta.env.VITE_API_URL || "https://examportal-an9p.onrender.com/api";

// Authentication storage
const AUTH_TOKEN_KEY = "emp_auth_token";
const AUTH_USER_KEY = "emp_auth_user";

// Get authentication token
export const getAuthToken = () => {
    return localStorage.getItem(AUTH_TOKEN_KEY);
};

// Store authentication token
export const setAuthToken = (token) => {
    if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
        localStorage.removeItem(AUTH_TOKEN_KEY);
    }
};

// Remove authentication data
export const clearAuth = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
};

// Get stored user
export const getStoredUser = () => {
    try {
        const raw = localStorage.getItem(AUTH_USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error("Failed to read stored user:", error);
        return null;
    }
};

// Store user
export const setStoredUser = (user) => {
    try {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } catch (error) {
        console.error("Failed to store user:", error);
    }
};

// Generic API request
export const apiRequest = async (endpoint, options = {}) => {
    const token = getAuthToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    let responseData = null;

    try {
        responseData = await response.json();
    } catch {
        responseData = null;
    }

    if (!response.ok) {
        const message =
            responseData?.message ||
            `Request failed with status ${response.status}`;

        const error = new Error(message);
        error.status = response.status;
        error.response = responseData;

        if (response.status === 401) {
            clearAuth();
        }

        throw error;
    }

    return responseData;
};

// GET request
export const get = async (endpoint, options = {}) => {
    return apiRequest(endpoint, {
        method: "GET",
        ...options
    });
};

// POST request
export const post = async (endpoint, data, options = {}) => {
    return apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(data),
        ...options
    });
};

// PUT request
export const put = async (endpoint, data, options = {}) => {
    return apiRequest(endpoint, {
        method: "PUT",
        body: JSON.stringify(data),
        ...options
    });
};

// PATCH request
export const patch = async (endpoint, data, options = {}) => {
    return apiRequest(endpoint, {
        method: "PATCH",
        body: JSON.stringify(data),
        ...options
    });
};

// DELETE request
export const del = async (endpoint, options = {}) => {
    return apiRequest(endpoint, {
        method: "DELETE",
        ...options
    });
};

// Request delay helper
export const delay = (ms = 180) =>
    new Promise((resolve) => setTimeout(resolve, ms));

// API response helper
export const createApiResponse = (
    data,
    success = true,
    message = ""
) => {
    return {
        success,
        data,
        message,
        timestamp: new Date().toISOString()
    };
};

// API error helper
export const createApiError = (
    message = "An unexpected error occurred",
    status = 400
) => {
    const error = new Error(message);
    error.status = status;
    error.response = {
        data: {
            message,
            status
        }
    };

    return error;
};

export { API_BASE_URL };