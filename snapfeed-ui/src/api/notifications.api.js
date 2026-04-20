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

  /** PATCH /notifications/:id/read */
  async markRead(recipientId) {
    if (!recipientId) return null;
    const data = await api.patch(`/notifications/${recipientId}/read`);
    return normalizeNotificationRecipient(data);
  },

  /** PATCH /notifications/read-all */
  async markReadAll() {
    const data = await api.patch("/notifications/read-all");
    return data;
  },

  /** GET /notifications/unread-count */
  async unreadCount() {
    const data = await api.get("/notifications/unread-count");
    return typeof data?.count === "number" ? data.count : 0;
  },
};
