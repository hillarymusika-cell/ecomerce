import api from "./client";

export const getDashboard = () => api.get("/api/admin/dashboard/");
export const getUsers = (params = {}) => api.get("/api/admin/users/", { params });
export const updateUser = (id, data) => api.patch(`/api/admin/users/${id}/`, data);
export const getAdminOrders = (params = {}) => api.get("/api/admin/orders/", { params });
export const updateOrderStatus = (id, status) =>
  api.patch(`/api/admin/orders/${id}/`, { status });
