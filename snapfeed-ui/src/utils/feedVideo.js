const s3Base =
  (import.meta.env.VITE_S3_BUCKET_URL || "").replace(/\/$/, "") || "";

export function buildVideoSrc(videoKey) {
  if (!videoKey || !s3Base) return "";
  // Encode each path segment to handle spaces and special characters
  const key = String(videoKey).replace(/^\//, "");
  const encodedKey = key.split('/').map(segment => encodeURIComponent(segment)).join('/');
  return `${s3Base}/${encodedKey}`;
}
