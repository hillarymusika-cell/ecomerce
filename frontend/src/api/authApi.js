import api from "./client";

export const register = (data) => api.post("/auth/register/", data);
export const login = (data, type = "customer") => {
  const endpoint = {
    customer: "/auth/login/",
    staff: "/auth/staff/login/",
    admin: "/auth/admin/login/",
    superuser: "/auth/superuser/login/",
  }[type] || "/auth/login/";
  return api.post(endpoint, data);
};
export const logout = (refresh) => api.post("/auth/logout/", { refresh });
export const getMe = () => api.get("/auth/me/");