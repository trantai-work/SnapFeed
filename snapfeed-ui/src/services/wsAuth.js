import axios from "axios";

let refreshPromise = null;

export async function refreshAccessTokenOnce() {
  if (refreshPromise) return refreshPromise;

  const base = import.meta.env.VITE_API_URL;
  const url = `${String(base || "").replace(/\/+$/, "")}/auth/refresh`;
  refreshPromise = axios
    .post(url, {}, { withCredentials: true })
    .catch((err) => {
      console.error("[wsAuth] refresh token failed", err);
      throw err;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

