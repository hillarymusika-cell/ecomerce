import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const access = localStorage.getItem("access_token");
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original?._retry) {
      return Promise.reject(error);
    }

    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      // Single-flight refresh so parallel 401s share one request
      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${BASE_URL}/auth/token/refresh/`, { refresh })
          .then((res) => {
            const access = res.data.access;
            localStorage.setItem("access_token", access);
            if (res.data.refresh) {
              localStorage.setItem("refresh_token", res.data.refresh);
            }
            return access;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const access = await refreshPromise;
      original.headers.Authorization = `Bearer ${access}`;
      return api(original);
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      return Promise.reject(error);
    }
  }
);

export default api;
