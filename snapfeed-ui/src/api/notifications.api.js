import api from "./api";
import {
  cursorFromNextLink,
  normalizeNotificationRecipient,
} from "../utils/notificationItem";

export const notificationsApi = {
  /**
   * GET /notifications — cursor pagination (optional cursor, page_size).
   * Returns { next, previous, results } after axios unwrap.
   */
  async list({ cursor, pageSize } = {}) {
    const params = {};
    if (cursor) params.cursor = cursor;
    if (pageSize != null) params.page_size = pageSize;

    const data = await api.get("/notifications", { params });
    const rawResults = Array.isArray(data?.results) ? data.results : [];
    return {
      next: data?.next ?? null,
      previous: data?.previous ?? null,
      nextCursor: cursorFromNextLink(data?.next),
      results: rawResults.map(normalizeNotificationRecipient).filter(Boolean),
    };
  },
};
