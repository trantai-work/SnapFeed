import api from "./api";
import { cursorFromNextLink } from "../utils/notificationItem";
import { normalizeFeedItem } from "../utils/feedItem";

export const usersApi = {
  me: async () => {
    const data = await api.get("/users/me");
    return data;
  },

  /** GET /users/:id/profile */
  profile: async (userId) => {
    const data = await api.get(`/users/${userId}/profile`);
    return data;
  },

  /** GET /users/:id/videos — cursor pagination */
  videos: async (userId, { cursor } = {}) => {
    const params = {};
    if (cursor) params.cursor = cursor;

    const data = await api.get(`/users/${userId}/videos`, { params });
    const rawResults = Array.isArray(data?.results) ? data.results : [];
    return {
      next: data?.next ?? null,
      previous: data?.previous ?? null,
      nextCursor: cursorFromNextLink(data?.next),
      results: rawResults.map(normalizeFeedItem).filter(Boolean),
    };
  },

  /** GET /users/:id/reacted_videos — cursor pagination */
  reactedVideos: async (userId, { cursor } = {}) => {
    const params = {};
    if (cursor) params.cursor = cursor;

    const data = await api.get(`/users/${userId}/reacted_videos`, { params });
    const rawResults = Array.isArray(data?.results) ? data.results : [];
    return {
      next: data?.next ?? null,
      previous: data?.previous ?? null,
      nextCursor: cursorFromNextLink(data?.next),
      results: rawResults.map(normalizeFeedItem).filter(Boolean),
    };
  },

  /** GET /users/search?keyword=...&cursor=...&size=... */
  search: async ({ keyword, cursor = null, size = 20 } = {}) => {
    const q = String(keyword ?? "").trim();
    if (!q) return { results: [], nextCursor: null };

    const params = { keyword: q, size };
    if (cursor) params.cursor = cursor;

    const data = await api.get("/users/search", { params });
    const rawResults = Array.isArray(data?.results) ? data.results : [];
    return {
      results: rawResults.filter(Boolean),
      nextCursor: data?.nextCursor ?? data?.next_cursor ?? null,
    };
  },

  /** POST /users/:id/follow */
  follow: async (userId) => {
    const data = await api.post(`/users/${userId}/follow`);
    return data;
  },

  /** DELETE /users/:id/unfollow */
  unfollow: async (userId) => {
    const data = await api.delete(`/users/${userId}/unfollow`);
    return data;
  },

  /** GET /users/:id/followers?q=...&cursor=... */
  followers: async (userId, { q = "", cursor = null } = {}) => {
    const params = {};
    if (q) params.q = q;
    if (cursor) params.cursor = cursor;

    const data = await api.get(`/users/${userId}/followers`, { params });
    const rawResults = Array.isArray(data?.results) ? data.results : [];
    return {
      next: data?.next ?? null,
      previous: data?.previous ?? null,
      nextCursor: cursorFromNextLink(data?.next),
      results: rawResults.filter(Boolean),
    };
  },

  /** GET /users/:id/following?q=...&cursor=... */
  following: async (userId, { q = "", cursor = null } = {}) => {
    const params = {};
    if (q) params.q = q;
    if (cursor) params.cursor = cursor;

    const data = await api.get(`/users/${userId}/following`, { params });
    const rawResults = Array.isArray(data?.results) ? data.results : [];
    return {
      next: data?.next ?? null,
      previous: data?.previous ?? null,
      nextCursor: cursorFromNextLink(data?.next),
      results: rawResults.filter(Boolean),
    };
  },

  /** POST /users/reset-recommendations */
  resetRecommendations: async () => {
    const data = await api.post("/users/reset-recommendations");
    return data;
  },
};