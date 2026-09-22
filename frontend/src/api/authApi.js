import api from "./client";

export const register = (data) => api.post("/auth/register/", data);

/**
 * type: "customer" | "staff" | "admin" | "superuser" | "unified"
 * Prefer "unified" (POST /auth/login/) for storefront.
 */
export const login = (data, type = "unified") => {
  const endpoint = {
    unified: "/auth/login/",
    customer: "/auth/customer/login/",
    staff: "/auth/staff/login/",
    admin: "/auth/admin/login/",
    superuser: "/auth/superuser/login/",
  }[type] || "/auth/login/";

  const body =
    type === "unified" || type === "customer"
      ? { ...data, required_role: type === "customer" ? "customer" : undefined }
      : data;

  return api.post(endpoint, body);
};

export const logout = (refresh) => api.post("/auth/logout/", { refresh });
export const getMe = () => api.get("/auth/me/");
export const changePassword = (payload) =>
  api.post("/auth/change-password/", payload);
