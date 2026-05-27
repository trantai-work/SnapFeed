import api from "./api";
import { cursorFromNextLink } from "../utils/notificationItem";
import { normalizeComment } from "../utils/commentItem";

export const commentsApi = {
  /** GET /comments/:id */
  async getById(commentId) {
    if (!commentId) return null;
    const data = await api.get(`/comments/${commentId}`);
    return normalizeComment(data);
  },

  /** GET /comments?video_id=:id — cursor pagination */
  async list({ videoId, cursor, pageSize } = {}) {
    const params = {};
    if (videoId != null) params.video_id = videoId;
    if (cursor) params.cursor = cursor;
    if (pageSize != null) params.page_size = pageSize;

    const data = await api.get("/comments", { params });
    const rawResults = Array.isArray(data?.results) ? data.results : [];
    return {
      next: data?.next ?? null,
      previous: data?.previous ?? null,
      nextCursor: cursorFromNextLink(data?.next),
      results: rawResults.map(normalizeComment).filter(Boolean),
    };
  },

  /** GET /moderator/comments?video_id=:id — cursor pagination */
  async listModeratorComments({ videoId, cursor, pageSize } = {}) {
    const params = {};
    if (videoId != null) params.video_id = videoId;
    if (cursor) params.cursor = cursor;
    if (pageSize != null) params.page_size = pageSize;

    const data = await api.get(`/moderator/comments/`, { params });
    const rawResults = Array.isArray(data?.results) ? data.results : [];
    return {
      next: data?.next ?? null,
      previous: data?.previous ?? null,
      nextCursor: cursorFromNextLink(data?.next),
      results: rawResults.map(normalizeComment).filter(Boolean),
    };
  },

  /** POST /comments { video, content } */
  async create({ videoId, content } = {}) {
    const payload = { video: videoId, content };
    const data = await api.post("/comments", payload);
    return normalizeComment(data);
  },
};

