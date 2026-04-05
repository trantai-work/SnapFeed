import api from "./api";
import ApiError from "./ApiError";

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
  generatePresignedUrl: async ({ fileName, contentType }) => {
    const data = await api.post("/videos/generate_presigned_url", {
      fileName,
      contentType,
    });
    return data;
  },

  createVideo: async ({ description, videoKey, thumbnail, duration }) => {
    const formData = new FormData();
    if (description !== undefined) formData.append("description", description ?? "");
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
};
