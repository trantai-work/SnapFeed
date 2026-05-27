import api from "./api";
import { cursorFromNextLink } from "../utils/notificationItem";

export const messagesApi = {
  /** GET /chats/messages?conversation_id=... — cursor pagination */
  async list({ conversationId, cursor, pageSize } = {}) {
    const params = {};
    if (conversationId) params.conversation_id = conversationId;
    if (cursor) params.cursor = cursor;
    if (pageSize != null) params.page_size = pageSize;

    const data = await api.get("/chats/messages", { params });
    if (Array.isArray(data)) {
      return { results: data, next: null, previous: null, nextCursor: null };
    }
    const rawResults = Array.isArray(data?.results) ? data.results : [];
    return {
      next: data?.next ?? null,
      previous: data?.previous ?? null,
      nextCursor: cursorFromNextLink(data?.next),
      results: rawResults,
    };
  },

  /** POST /chats/messages */
  async create({ conversationId, content, attachmentKey, attachmentName, attachmentSize, attachmentType, sharedVideoId } = {}) {
    if (!conversationId) {
      throw new Error("conversationId is required");
    }
    const payload = {
      conversation: conversationId,
      content: content != null ? String(content) : undefined,
      attachmentKey,
      attachmentName,
      attachmentSize,
      attachmentType,
      sharedVideoId,
    };
    return await api.post("/chats/messages", payload);
  },

  /** POST /chats/messages/attachment/presigned-upload/ */
  async getUploadPresignedUrl({ conversationId, fileName, contentType }) {
    return await api.post("/chats/messages/attachment/presigned-upload", {
      conversation: conversationId,
      fileName,
      contentType,
    });
  },

  /** GET /chats/messages/attachment/presigned-download/ */
  async getDownloadPresignedUrl(key, downloadFilename = null) {
    const params = { key };
    if (downloadFilename) params.filename = downloadFilename;
    return await api.get("/chats/messages/attachment/presigned-download", { params });
  },
};

