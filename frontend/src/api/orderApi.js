import api from "./client";

export const getOrders = () => api.get("/api/orders/");
export const getOrder = (id) => api.get(`/api/orders/${id}/`);
export const createOrder = (data) => api.post("/api/orders/", data);