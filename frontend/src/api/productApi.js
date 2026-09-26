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

/** Multipart upload — field name "images" (multiple). */
export const uploadProductImages = (slug, files, { isPrimary = false, altText = "" } = {}) => {
  const form = new FormData();
  const list = Array.isArray(files) ? files : [files];
  list.forEach((f) => form.append("images", f));
  if (isPrimary) form.append("is_primary", "true");
  if (altText) form.append("alt_text", altText);
  // Do not set Content-Type manually — browser must add multipart boundary
  return api.post(`/api/products/${slug}/images/`, form, {
    headers: { "Content-Type": undefined },
    transformRequest: [(data, headers) => {
      if (data instanceof FormData) {
        delete headers["Content-Type"];
      }
      return data;
    }],
  });
};

export const deleteProductImage = (slug, imageId) =>
  api.delete(`/api/products/${slug}/images/${imageId}/`);

export const setPrimaryProductImage = (slug, imageId) =>
  api.post(`/api/products/${slug}/images/${imageId}/primary/`);
