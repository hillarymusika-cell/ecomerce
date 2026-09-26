import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  getMe,
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
  changePassword as changePasswordApi,
} from "../api/authApi";
import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
  getRememberPreference,
} from "../utils/session";

const AuthContext = createContext(null);

/** Prefer flags over stored role string so admin/staff always resolve correctly. */
export function deriveRole(user) {
  if (!user) return null;
  if (user.is_superuser || user.is_admin) return "admin";
  if (user.is_staff) return "staff";
  const label = (user.role_label || user.role || "").toString().trim().toLowerCase();
  if (label === "admin" || label === "staff" || label === "customer") return label;
  return "customer";
}

/** Default home path after login for each role. */
export function homeForRole(role) {
  if (role === "admin") return "/admin";
  if (role === "staff") return "/staff";
  return "/";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const saveSession = useCallback((data, remember = getRememberPreference()) => {
    const tokens = data.tokens || data;
    saveTokens(
      { access: tokens.access, refresh: tokens.refresh },
      remember
    );
    if (data.user) setUser(data.user);
  }, []);

  const login = async (credentials, type = "unified", options = {}) => {
    const remember = options.remember !== false;
    const { data } = await loginApi(credentials, type);
    saveSession(data, remember);
    let currentUser = data.user;
    if (!currentUser) {
      const me = await getMe();
      currentUser = me.data;
      setUser(currentUser);
    }
    return { ...data, user: currentUser, role: deriveRole(currentUser) };
  };

  const register = async (payload, options = {}) => {
    const remember = options.remember !== false;
    const { data } = await registerApi(payload);
    saveSession(data, remember);
    return data;
  };

  const logout = async () => {
    const refresh = getRefreshToken();
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
    if (data.tokens) saveSession(data, getRememberPreference());
    return data;
  };

  const refreshUser = useCallback(async () => {
    const access = getAccessToken();
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
    const access = getAccessToken();
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
