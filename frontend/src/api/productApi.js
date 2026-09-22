import api from "./client";

export const getProducts = (params = {}) => api.get("/api/products/", { params });
export const getProduct = (slug) => api.get(`/api/products/${slug}/`);
export const getAllProducts = (params = {}) =>
  api.get("/api/products/", { params: { ...params, all: true } });
export const createProduct = (data) => api.post("/api/products/", data);
export const updateProduct = (slug, data) => api.patch(`/api/products/${slug}/`, data);
export const deleteProduct = (slug) => api.delete(`/api/products/${slug}/`);
export const getCategories = () => api.get("/api/categories/");
export const createCategory = (data) => api.post("/api/categories/", data);
