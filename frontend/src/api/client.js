import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  updateAccessToken,
  clearTokens,
} from "../utils/session";

// Strip trailing slash so paths like /auth/login/ never become //auth/login/
const BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(
  /\/+$/,
  ""
);

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: "application/json",
  },
  // JWT is sent via Authorization header – no cookies needed for API calls
  withCredentials: false,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const access = getAccessToken();
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }

  // FormData (image upload): let the browser set multipart boundary.
  // Plain objects: default to JSON.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }
  } else if (
    config.data &&
    typeof config.data === "object" &&
    !(config.data instanceof FormData)
  ) {
    config.headers = config.headers || {};
    if (!config.headers["Content-Type"] && !config.headers["content-type"]) {
      config.headers["Content-Type"] = "application/json";
    }
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
export { BASE_URL };
