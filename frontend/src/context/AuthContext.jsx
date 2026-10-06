import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import { authService } from "../services/authService";
import { profileService } from "../services/profileService";
import { normalizeUser } from "../utils/identity";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        const token = authService.isAuthenticated();

        if (!token) {
          if (active) setUser(null);
          return;
        }

        const response = await profileService.getProfile();
        if (active) setUser(response.data);
      } catch (error) {
        console.error(
          "Failed to restore auth session:",
          error
        );

        if (!active) return;

        if (error.status === 401) {
          setUser(null);
        } else {
          setUser(normalizeUser(authService.getStoredUser()));
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  // Login user
  const login = async (email, password) => {
    setIsLoading(true);

    try {
      const response = await authService.login(
        email,
        password
      );

      let nextUser = response.data.user;

      try {
        const profile = await profileService.getProfile();
        if (profile.data?.role) nextUser = profile.data;
      } catch (error) {
        if (error.status === 401) throw error;
      }

      setUser(nextUser);

      return nextUser;
    } finally {
      setIsLoading(false);
    }
  };

  // Register student
  const register = async (formData) => {
    setIsLoading(true);

    try {
      const response =
        await authService.register(formData);

      setUser(response.data.user);

      return response.data.user;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    setIsLoading(true);

    try {
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Update user
  const updateUser = (updatedFields) => {
    setUser((previousUser) => {
      if (!previousUser) {
        return previousUser;
      }

      const updatedUser = normalizeUser({
        ...previousUser,
        ...updatedFields
      }) || {
        ...previousUser,
        ...updatedFields
      };

      authService.updateStoredUser(updatedUser);

      return updatedUser;
    });
  };

  const value = {
    user,
    role: user?.role || null,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    register,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
};