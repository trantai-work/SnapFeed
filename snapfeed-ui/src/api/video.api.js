import api from "./api";
import ApiError from "./ApiError";
import { normalizeFeedItem } from "../utils/feedItem";

export const uploadToS3 = async ({ url, fields, file, onProgress }) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else if (xhr.status === 400 || xhr.status === 403) {
        // S3 returns 400 EntityTooLarge when file exceeds content-length-range policy
        const isTooBig =
          xhr.responseText?.includes("EntityTooLarge") ||
          xhr.responseText?.includes("MaxSizeExceeded");
        if (isTooBig) {
          reject(new ApiError("File vượt quá giới hạn 500MB cho phép"));
        } else {
          reject(new ApiError(`S3 upload failed with status ${xhr.status}`));
        }
      } else {
        reject(new ApiError(`S3 upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new ApiError("S3 upload network error"));
    xhr.onabort = () => reject(new ApiError("Upload cancelled"));

    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
    formData.append("file", file);

    xhr.open("POST", url);
    xhr.send(formData);
  });
};

/**
 * Upload a file to S3 using presigned POST (single-part).
 * S3 enforces the 500MB size limit via content-length-range policy.
 *
 * @param {Object} options
 * @param {File}     options.file         - The file to upload
 * @param {Function} options.onProgress   - Called with (percent: number)
 * @param {Object}   options.abortSignal  - AbortSignal to cancel the upload
 * @returns {Promise<string>}             - Resolves with the s3_key
 */
export async function presignedPostUpload({ file, onProgress, abortSignal }) {
  if (abortSignal?.aborted) throw new Error("Upload cancelled");

  const { url, fields } = await videosApi.generatePresignedUrl({
    fileName: file.name,
    contentType: file.type || "video/mp4",
  });

  // s3_key is stored in fields.key by S3 presigned POST format
  const s3Key = fields?.key;
  if (!s3Key) throw new ApiError("Missing S3 key from presigned URL response");

  if (abortSignal?.aborted) throw new Error("Upload cancelled");

  await new Promise((resolve, reject) => {
    abortSignal?.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    uploadToS3({ url, fields, file, onProgress })
      .then(resolve)
      .catch(reject);
  });

  onProgress?.(100);
  return s3Key;
}

/**
 * Check if a watch_time qualifies as a valid view — mirrors backend logic.
 * Short videos (duration <= 5s): must watch >= 50%
 * Longer videos: must watch >= 5s AND >= 10%
 */
export function isValidView(watchTime, duration) {
  if (!duration || duration <= 0) return false;
  const ratio = watchTime / duration;
  if (duration <= 5) return ratio >= 0.5;
  return watchTime >= 5 && ratio >= 0.1;
}

export const videosApi = {
  /** GET /videos/:id */
  getById: async (videoId) => {
    if (!videoId) return null;
    const data = await api.get(`/videos/${videoId}`);
    return normalizeFeedItem(data);
  },

  getModeratorVideoById: async (videoId) => {
    if (!videoId) return null;
    const data = await api.get(`/moderator/videos/${videoId}/`);
    return normalizeFeedItem(data);
  },

  generatePresignedUrl: async ({ fileName, contentType }) => {
    const data = await api.post("/videos/generate_presigned_url", {
      fileName,
      contentType,
    });
    return data; // { url, fields, s3Key }
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
   * DELETE /videos/:id — hard delete a video (owner only).
   */
  deleteVideo: async (videoId) => {
    await api.delete(`/videos/${videoId}`);
  },

  /**
   * PUT /videos/:id/view — record watch time for a video.
   */
  recordView: async ({ videoId, watchTime }) => {
    await api.put(`/videos/${videoId}/view`, { watch_time: watchTime });
  },

  /**
   * PUT /videos/:id/react — set, change, or toggle off (same type as current) reaction.
   */
  reactToVideo: async (videoId, reaction) => {
    const data = await api.put(`/videos/${videoId}/react`, { reaction });
    return data;
  },

  /**
   * POST /videos/:id/report
   */
  reportVideo: async ({ videoId, reason, description = "" }) => {
    const data = await api.post(`/videos/${videoId}/report`, {
      reason,
      description,
    });
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

