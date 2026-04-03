import axios from "axios";
import i18n from "../i18n";
import ApiError from "./ApiError";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// =======================
// Refresh state
// =======================
let isRefreshing = false;
let queue = [];

function addToQueue(resolve, reject, config) {
  queue.push({ resolve, reject, config });
}

function resolveQueue() {
  queue.forEach(({ resolve, config }) => resolve(api(config)));
  queue = [];
}

function rejectQueue(err) {
  queue.forEach(({ reject }) => reject(err));
  queue = [];
}

async function refreshToken() {
  return axios.post(
    `${import.meta.env.VITE_API_URL}/auth/refresh`,
    {},
    { withCredentials: true }
  );
}

api.interceptors.response.use(
  (response) => {
    return response.data.data;
  },
  async (error) => {
    if (!error.response) {
      return Promise.reject(error);
    }

    const { status, data } = error.response;
    const config = error.config;

    // =======================
    // Handle 401
    // =======================
    if (status === 401 && config && !config._retry) {
      // Do not retry refresh API itself
      if (config.url && String(config.url).includes("/auth/refresh")) {
        return Promise.reject(error);
      }

      config._retry = true;

      // If refreshing, queue the request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          addToQueue(resolve, reject, config);
        });
      }

      isRefreshing = true;

      try {
        await refreshToken();

        isRefreshing = false;
        resolveQueue();

        return api(config); // retry the current request
      } catch (err) { // Refresh fail -> Handle logic UX later, can use trigger logout event
        isRefreshing = false;
        rejectQueue(err);
      
        return Promise.reject(
          new ApiError(i18n.t("errors.unauthorized"), { status: 401 })
        );
      }
    }

    // =======================
    // Default error
    // =======================
    const message =
      data?.message ||
      (status === 500 && i18n.t("errors.server")) ||
      (status === 401 && i18n.t("errors.unauthorized")) ||
      i18n.t("errors.default");

    return Promise.reject(
      new ApiError(message, {
        status,
      })
    );
  }
);

export default api;