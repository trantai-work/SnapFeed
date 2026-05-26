import api from "./api";

export const conversationsApi = {
  /** GET /conversations — cursor pagination (optional cursor, page_size). */
  async list({ cursor, pageSize } = {}) {
    const params = {};
    if (cursor) params.cursor = cursor;
    if (pageSize != null) params.page_size = pageSize;

    const data = await api.get("/conversations", { params });
    const rawResults = Array.isArray(data?.results) ? data.results : [];
    return {
      next: data?.next ?? null,
      previous: data?.previous ?? null,
      results: rawResults,
    };
  },

  /** GET /conversations/unread-count */
  async unreadCount() {
    const data = await api.get("/conversations/unread-count");
    return typeof data?.count === "number" ? data.count : 0;
  },

  /** POST /conversations/direct — get or create DM conversation */
  async direct(userId) {
    if (!userId) throw new Error("userId is required");
    const data = await api.post("/conversations/direct", { user: userId });
    return data;
  },

  /** POST /conversations/group — create group conversation */
  async group({ title, userIds } = {}) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error("userIds array is required and cannot be empty");
    }
    const data = await api.post("/conversations/group", { title, userIds });
    return data;
  },

  /** POST /conversations/:id/read — mark conversation read */
  async markRead(conversationId, { upToMessageId } = {}) {
    if (!conversationId) throw new Error("conversationId is required");
    const payload = {};
    if (upToMessageId) payload.up_to_message_id = upToMessageId;
    const data = await api.post(`/conversations/${conversationId}/read`, payload);
    return data;
  },

  /** POST /conversations/:id/add-members — add users to group conversation */
  async addMembers(conversationId, userIds) {
    if (!conversationId) throw new Error("conversationId is required");
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error("userIds array is required and cannot be empty");
    }
    const data = await api.post(`/conversations/${conversationId}/add-members`, { user_ids: userIds });
    return data;
  },
};

