import api from "./client";

export const getCart = () => api.get("/api/cart/");
export const addToCart = (product_id, quantity = 1) =>
  api.post("/api/cart/add/", { product_id, quantity });
export const updateCartItem = (id, quantity) =>
  api.patch(`/api/cart/items/${id}/`, { quantity });
export const removeCartItem = (id) =>
  api.delete(`/api/cart/items/${id}/`);
export const clearCart = () => api.delete("/api/cart/clear/");