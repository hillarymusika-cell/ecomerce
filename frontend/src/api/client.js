import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  updateAccessToken,
  clearTokens,
} from "../utils/session";

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const access = getAccessToken();
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

    const refresh = getRefreshToken();
    if (!refresh) {
      clearTokens();
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${BASE_URL}/auth/token/refresh/`, { refresh })
          .then((res) => {
            const access = res.data.access;
            updateAccessToken(access);
            if (res.data.refresh) {
              // Keep refresh in same store as access
              updateAccessToken(access);
              const remember =
                localStorage.getItem("auth_remember") !== "0";
              if (remember) {
                localStorage.setItem("refresh_token", res.data.refresh);
              } else {
                sessionStorage.setItem("refresh_token", res.data.refresh);
              }
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
      clearTokens();
      return Promise.reject(error);
    }
  }
);

export default api;
