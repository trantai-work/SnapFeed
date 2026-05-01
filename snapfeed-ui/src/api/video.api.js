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

/**
 * Upload a single part directly to S3 via presigned URL.
 * Returns the ETag from the response header.
 */
export const uploadPartToS3 = async ({ presignedUrl, chunk, onProgress }) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded, e.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        if (!etag) return reject(new ApiError("Missing ETag from S3 part response"));
        resolve(etag);
      } else {
        reject(new ApiError(`S3 part upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new ApiError("S3 part upload network error"));
    xhr.onabort = () => reject(new ApiError("S3 part upload aborted"));

    xhr.open("PUT", presignedUrl);
    xhr.send(chunk);
  });
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

  initiateMultipartUpload: async ({ fileName, contentType }) => {
    const data = await api.post("/videos/multipart/initiate", {
      file_name: fileName,
      content_type: contentType,
    });
    return data; // { uploadId, s3Key }
  },

  generatePartPresignedUrl: async ({ s3Key, uploadId, partNumber }) => {
    const data = await api.post("/videos/multipart/presigned-url", {
      s3_key: s3Key,
      upload_id: uploadId,
      part_number: partNumber,
    });
    return data; // { presignedUrl, partNumber }
  },

  completeMultipartUpload: async ({ s3Key, uploadId, parts }) => {
    const data = await api.post("/videos/multipart/complete", {
      s3_key: s3Key,
      upload_id: uploadId,
      parts: parts.map((p) => ({ part_number: p.partNumber, etag: p.etag })),
    });
    return data; // { s3Key }
  },

  abortMultipartUpload: async ({ s3Key, uploadId }) => {
    await api.post("/videos/multipart/abort", {
      s3_key: s3Key,
      upload_id: uploadId,
    });
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
