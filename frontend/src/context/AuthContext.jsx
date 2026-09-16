import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import { authService } from "../services/authService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = () => {
      try {
        const token = authService.isAuthenticated();
        const cachedUser = authService.getStoredUser();

        if (token && cachedUser) {
          setUser(cachedUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error(
          "Failed to restore auth session:",
          error
        );

        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Login user
  const login = async (email, password) => {
    setIsLoading(true);

    try {
      const response = await authService.login(
        email,
        password
      );

      setUser(response.data.user);

      return response.data.user;
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

      const updatedUser = {
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