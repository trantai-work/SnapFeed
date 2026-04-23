import api from "./api";
import ApiError from "./ApiError";
import { normalizeFeedItem } from "../utils/feedItem";

export const uploadToS3 = async ({ url, fields, file }) => {
  const formData = new FormData();
  // append S3 fields
  Object.entries(fields).forEach(([key, value]) => {
    formData.append(key, value);
  });
  // append the file as 'file'
  formData.append("file", file);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new ApiError("S3 upload failed", { status: response.status });
  }

  return response;
};

export const videosApi = {
  /** GET /videos/:id */
  getById: async (videoId) => {
    if (!videoId) return null;
    const data = await api.get(`/videos/${videoId}`);
    return normalizeFeedItem(data);
  },

  generatePresignedUrl: async ({ fileName, contentType }) => {
    const data = await api.post("/videos/generate_presigned_url", {
      fileName,
      contentType,
    });
    return data;
  },

  createVideo: async ({ title, description, tags, videoKey, thumbnail, duration }) => {
    const formData = new FormData();
    if (title !== undefined) formData.append("title", title ?? "");
    if (description !== undefined) formData.append("description", description ?? "");
    if (Array.isArray(tags)) {
      for (const t of tags) formData.append("tags_input", String(t ?? ""));
    }
    if (videoKey !== undefined) formData.append("video_key", videoKey ?? "");
    if (thumbnail) formData.append("thumbnail", thumbnail);
    if (duration !== undefined && duration !== null) {
      formData.append("duration", String(duration));
    }

    const data = await api.post("/videos", formData);
    return data;
  },

  /**
   * PUT /videos/:id/react — set, change, or toggle off (same type as current) reaction.
   */
  reactToVideo: async (videoId, reaction) => {
    const data = await api.put(`/videos/${videoId}/react`, { reaction });
    return data;
  },

  /** GET /videos/search?keyword=...&cursor=...&size=... */
  search: async ({ keyword, cursor = null, size = 20 } = {}) => {
    const q = String(keyword ?? "").trim();
    if (!q) return { results: [], nextCursor: null };

    const params = { keyword: q, size };
    if (cursor) params.cursor = cursor;

    const data = await api.get("/videos/search", { params });
    const rawResults = Array.isArray(data?.results) ? data.results : [];
    return {
      results: rawResults.map(normalizeFeedItem).filter(Boolean),
      nextCursor: data?.nextCursor ?? data?.next_cursor ?? null,
    };
  },
};
