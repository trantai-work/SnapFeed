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
};