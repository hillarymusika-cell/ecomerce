import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const access = localStorage.getItem("access_token");
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original?._retry) {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        original._retry = true;
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/api/token/refresh/`,
            { refresh }
          );
          localStorage.setItem("access_token", response.data.access);
          original.headers.Authorization = `Bearer ${response.data.access}`;
          return api(original);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;