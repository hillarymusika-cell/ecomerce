import api from "./client";

export const getDashboard = (params = {}) =>
  api.get("/api/admin/dashboard/", { params });

export const getStaffDashboard = () => api.get("/api/staff/dashboard/");

export const getUsers = (params = {}) =>
  api.get("/api/admin/users/", { params: { page_size: 200, ...params } });

export const updateUser = (id, data) =>
  api.patch(`/api/admin/users/${id}/`, data);

export const getAdminOrders = (params = {}) =>
  api.get("/api/admin/orders/", { params: { page_size: 200, ...params } });

export const updateOrderStatus = (id, status) =>
  api.patch(`/api/admin/orders/${id}/`, { status });
