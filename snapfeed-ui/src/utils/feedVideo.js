const s3Base =
  (import.meta.env.VITE_S3_BUCKET_URL || "").replace(/\/$/, "") || "";

export function buildVideoSrc(videoKey) {
  if (!videoKey || !s3Base) return "";
  return `${s3Base}/${String(videoKey).replace(/^\//, "")}`;
}
