import i18n from "../i18n";

export async function getVideoDurationSeconds(file) {
  if (!file) throw new Error(i18n.t("errors.missingVideoFile"));
  const url = URL.createObjectURL(file);
  try {
    const duration = await new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";

      const cleanup = () => {
        video.removeAttribute("src");
        video.load();
      };

      video.onloadedmetadata = () => {
        const d = Number(video.duration);
        cleanup();
        if (!Number.isFinite(d) || d <= 0) {
          return reject(new Error(i18n.t("errors.cannotReadVideoDuration")));
        }
        resolve(d);
      };

      video.onerror = () => {
        cleanup();
        reject(new Error(i18n.t("errors.cannotReadVideoMetadata")));
      };

      video.src = url;
    });

    return Math.round(duration);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function getVideoFirstFrameJpegFile(file, { fileNameBase = "thumbnail", quality = 0.9 } = {}) {
  if (!file) throw new Error(i18n.t("errors.missingVideoFile"));

  const url = URL.createObjectURL(file);
  try {
    const blob = await new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";

      const cleanup = () => {
        video.removeAttribute("src");
        video.load();
      };

      const capture = () => {
        try {
          const w = video.videoWidth;
          const h = video.videoHeight;
          if (!w || !h) throw new Error(i18n.t("errors.cannotReadVideoDimensions"));

          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error(i18n.t("errors.cannotCreateCanvasContext"));
          ctx.drawImage(video, 0, 0, w, h);

          canvas.toBlob(
            (b) => {
              cleanup();
              if (!b) return reject(new Error(i18n.t("errors.cannotCreateThumbnail")));
              resolve(b);
            },
            "image/jpeg",
            quality
          );
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      video.onloadeddata = () => {
        // đảm bảo frame đầu có thể draw được
        if (video.readyState >= 2) capture();
      };

      video.onseeked = () => capture();

      video.onerror = () => {
        cleanup();
        reject(new Error(i18n.t("errors.cannotReadVideoForThumbnail")));
      };

      video.src = url;
      // seek về đầu để chắc chắn lấy first frame
      video.currentTime = 0;
    });

    return new File([blob], `${fileNameBase}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

