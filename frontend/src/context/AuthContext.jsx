import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  getMe,
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
  changePassword as changePasswordApi,
} from "../api/authApi";

const AuthContext = createContext(null);

function deriveRole(user) {
  if (!user) return null;
  if (user.role_label) return user.role_label;
  if (user.is_superuser || user.is_admin) return "admin";
  if (user.is_staff) return "staff";
  return "customer";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  }, []);

  const saveSession = useCallback((data) => {
    const tokens = data.tokens || data;
    if (tokens.access) localStorage.setItem("access_token", tokens.access);
    if (tokens.refresh) localStorage.setItem("refresh_token", tokens.refresh);
    if (data.user) setUser(data.user);
  }, []);

  const login = async (credentials, type = "unified") => {
    const { data } = await loginApi(credentials, type);
    saveSession(data);
    if (!data.user) {
      const me = await getMe();
      setUser(me.data);
    }
    return data;
  };

  const register = async (payload) => {
    const { data } = await registerApi(payload);
    saveSession(data);
    return data;
  };

  const logout = async () => {
    const refresh = localStorage.getItem("refresh_token");
    try {
      if (refresh) await logoutApi(refresh);
    } catch {
      /* ignore */
    } finally {
      clearSession();
    }
  };

  const changePassword = async ({ current_password, new_password }) => {
    const { data } = await changePasswordApi({ current_password, new_password });
    if (data.tokens) saveSession(data);
    return data;
  };

  const refreshUser = useCallback(async () => {
    const access = localStorage.getItem("access_token");
    if (!access) {
      setUser(null);
      return null;
    }
    try {
      const { data } = await getMe();
      setUser(data);
      return data;
    } catch {
      clearSession();
      return null;
    }
  }, [clearSession]);

  useEffect(() => {
    const access = localStorage.getItem("access_token");
    if (!access) {
      setLoading(false);
      return;
    }
    getMe()
      .then((response) => setUser(response.data))
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, [clearSession]);

  const role = deriveRole(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        changePassword,
        refreshUser,
        isAuthenticated: !!user,
        isStaff: role === "staff" || role === "admin",
        isAdmin: role === "admin",
        role,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
