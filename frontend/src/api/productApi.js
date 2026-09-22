import api from "./client";

export const getProducts = (params = {}) => api.get("/api/products/", { params });
export const getProduct = (slug) => api.get(`/api/products/${slug}/`);