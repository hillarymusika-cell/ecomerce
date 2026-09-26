import api from "./client";

export const getOrders = () => api.get("/api/orders/");
export const getOrder = (id) => api.get(`/api/orders/${id}/`);
export const createOrder = (data) => api.post("/api/orders/", data);

/** Start card payment – returns Flutterwave config or demo_mode flag. */
export const initiatePayment = (orderId, payload = {}) =>
  api.post(`/api/orders/${orderId}/pay/`, payload);

/** Confirm after Flutterwave success or demo card pay. */
export const confirmPayment = (orderId, payload = {}) =>
  api.post(`/api/orders/${orderId}/pay/confirm/`, payload);
