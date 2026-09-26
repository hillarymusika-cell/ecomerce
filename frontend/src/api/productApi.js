import api from "./client";

export const getProducts = (params = {}) => api.get("/api/products/", { params });
export const getProduct = (slug) => api.get(`/api/products/${slug}/`);
/** Staff inventory: request a large page so the table is complete. */
export const getAllProducts = (params = {}) =>
  api.get("/api/products/", { params: { page_size: 500, ...params } });
export const createProduct = (data) => api.post("/api/products/", data);
export const updateProduct = (slug, data) => api.patch(`/api/products/${slug}/`, data);
export const deleteProduct = (slug) => api.delete(`/api/products/${slug}/`);
export const getCategories = () =>
  api.get("/api/categories/", { params: { page_size: 200 } });
export const createCategory = (data) => api.post("/api/categories/", data);
