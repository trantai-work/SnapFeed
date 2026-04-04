import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ImagePlus, RefreshCcw, Upload, X } from "lucide-react";
import { uploadToS3, videosApi } from "../api/video.api";
import { useMessageBox } from "../components/MessageBox";
import { useUploadDraft } from "../context/UploadDraftContext";
import ThemeToggle from "../components/ThemeToggle";
import logo from "../assets/logo.png";
import logoLightMode from "../assets/logo_light_mode.png";
import { useTheme } from "../context/ThemeContext";
import { getVideoDurationSeconds, getVideoFirstFrameJpegFile } from "../utils/video";

export default function VideoUploadPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { show } = useMessageBox();
  const {
    videoFile,
    coverFile,
    description,
    videoPreviewUrl,
    coverPreviewUrl,
    setVideo,
    setCover,
    setDescription,
    reset,
  } = useUploadDraft();

  const pickVideoRef = useRef(null);
  const pickCoverRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [defaultCoverFile, setDefaultCoverFile] = useState(null);
  const [defaultCoverPreviewUrl, setDefaultCoverPreviewUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";

    const createDefaultCover = async () => {
      if (!videoFile) {
        setDefaultCoverFile(null);
        setDefaultCoverPreviewUrl("");
        return;
      }

      try {
        const frameFile = await getVideoFirstFrameJpegFile(videoFile, {
          fileNameBase: videoFile.name.replace(/\.[^/.]+$/, ""),
        });
        if (cancelled) return;

        objectUrl = URL.createObjectURL(frameFile);
        setDefaultCoverFile(frameFile);
        setDefaultCoverPreviewUrl(objectUrl);
      } catch {
        if (cancelled) return;
        setDefaultCoverFile(null);
        setDefaultCoverPreviewUrl("");
      }
    };

    createDefaultCover();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [videoFile]);

  const effectiveCoverPreviewUrl = coverPreviewUrl || defaultCoverPreviewUrl;

  const fileLabel = useMemo(() => {
    if (!videoFile) return "";
    const mb = (videoFile.size / (1024 * 1024)).toFixed(2);
    return `${videoFile.name} (${mb}MB)`;
  }, [videoFile]);

  const onPickVideo = () => {
    const el = pickVideoRef.current;
    if (!el) return;
    el.value = "";
    el.click();
  };

  const onPickCover = () => {
    const el = pickCoverRef.current;
    if (!el) return;
    el.value = "";
    el.click();
  };

  const acceptVideo = (f) => {
    if (!f) return;
    const isMp4 =
      String(f.type).toLowerCase() === "video/mp4" ||
      String(f.name).toLowerCase().endsWith(".mp4");
    if (!isMp4) {
      show({
        status: "warning",
        message: "Không hỗ trợ file có định dạng này",
      });
      return;
    }
    setVideo(f);
  };

  const acceptCover = (f) => {
    if (!f) return;
    if (!String(f.type).toLowerCase().startsWith("image/")) {
      show({
        status: "warning",
        message: "Vui lòng chọn file ảnh hợp lệ",
      });
      return;
    }
    setCover(f);
  };

  const onCancel = () => {
    reset();
    navigate("/upload");
  };

  const onSubmit = async () => {
    if (!videoFile) {
      show({
        status: "warning",
        message: "Chưa có video để đăng",
      });
      navigate("/upload");
      return;
    }
    if (isUploading) return;

    try {
      setIsUploading(true);
      show({
        status: "success",
        title: "Đang đăng tải",
        message: "Vui lòng chờ trong giây lát...",
        duration: 2000,
      });

      const presign = await videosApi.generatePresignedUrl({
        fileName: videoFile.name,
        contentType: videoFile.type || "video/mp4",
      });

      const { url, fields } = presign || {};
      if (!url || !fields) throw new Error("Presigned data không hợp lệ.");

      await uploadToS3({ url, fields, file: videoFile });

      const videoKey = fields?.key;
      if (!videoKey) throw new Error("Thiếu videoKey từ presigned response.");

      const duration = await getVideoDurationSeconds(videoFile);

      let thumbnailFile = coverFile || defaultCoverFile || undefined;
      if (!thumbnailFile) {
        try {
          thumbnailFile = await getVideoFirstFrameJpegFile(videoFile, {
            fileNameBase: videoFile.name.replace(/\.[^/.]+$/, ""),
          });
        } catch (err) {
          show({
            status: "warning",
            title: "Không tạo được ảnh bìa",
            message: "Sẽ đăng video mà không có thumbnail.",
          });
        }
      }

      await videosApi.createVideo({
        description,
        videoKey,
        thumbnail: thumbnailFile,
        duration,
      });

      show({
        status: "success",
        title: "Tải lên thành công",
        message: "Video đã được đăng tải.",
      });

      reset();
      navigate("/");
    } catch (e) {
      show({
        status: "error",
        title: "Upload thất bại",
        message: e?.message || "Vui lòng thử lại.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const barClass =
    "border-gray-200 bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900";

  if (!videoFile) {
    return (
      <div className="h-screen overflow-hidden bg-gray-50 transition-colors dark:bg-zinc-950">
        <div
          className={`fixed top-0 right-0 left-0 z-20 flex h-[72px] items-center justify-between border-b px-3 sm:px-6 ${barClass}`}
        >
          <img
            src={theme === "light" ? logoLightMode : logo}
            alt="SnapFeed"
            className="h-10 w-auto max-w-[min(220px,50vw)] object-contain object-left sm:h-11"
          />
          <ThemeToggle />
        </div>

        <div
          className={`fixed top-[72px] bottom-0 left-0 z-10 hidden w-[260px] border-r lg:block ${barClass}`}
        />

        {/* Main scroll area */}
        <div className="pt-[72px] lg:pl-[260px] h-full">
          <div className="h-[calc(100vh-72px)] overflow-y-auto p-3 sm:p-6">
            <div className="max-w-5xl mx-auto mt-4">
              <div className="rounded-2xl bg-white p-4 text-gray-900 shadow-sm dark:bg-zinc-900 dark:text-white sm:p-8">
                <div className="text-lg font-semibold">
                  Chưa có video để tải lên
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
                  Vui lòng chọn video ở trang Upload trước.
                </div>
                <button
                  type="button"
                  className="mt-4 px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-semibold cursor-pointer disabled:cursor-not-allowed"
                  onClick={() => navigate("/upload")}
                >
                  Đi tới Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50 transition-colors dark:bg-zinc-950">
      <div
        className={`fixed top-0 right-0 left-0 z-20 flex h-[72px] items-center justify-between border-b px-3 sm:px-6 ${barClass}`}
      >
        <img
          src={theme === "light" ? logoLightMode : logo}
          alt="SnapFeed"
          className="h-10 w-auto max-w-[min(220px,50vw)] object-contain object-left sm:h-11"
        />
        <ThemeToggle />
      </div>

      <div
        className={`fixed top-[72px] bottom-0 left-0 z-10 hidden w-[260px] border-r lg:block ${barClass}`}
      />

      {/* Main scroll area */}
      <div className="pt-[72px] lg:pl-[260px] h-full">
        <div className="h-[calc(100vh-72px)] overflow-y-auto p-3 sm:p-6">
          <div className="mx-auto mt-4 max-w-6xl">
            <div className="rounded-2xl bg-white p-4 text-gray-900 shadow-sm dark:bg-zinc-900 dark:text-white sm:p-6 md:p-8">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="font-semibold truncate">{videoFile.name}</div>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 text-[11px] leading-5 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {videoFile.type || "video/mp4"}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span className="truncate">
                        Đã tải lên ({(videoFile.size / (1024 * 1024)).toFixed(2)}MB)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      ref={pickVideoRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => acceptVideo(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      onClick={onPickVideo}
                      disabled={isUploading}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                    >
                      <RefreshCcw size={16} className="text-gray-700 dark:text-zinc-300" />
                      Thay thế
                    </button>
                  </div>
                </div>

                <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-700">
                  <div className="h-full bg-emerald-500 w-full" />
                </div>
              </div>

              {/* Content */}
              <div className="mt-6">
                {/* Details */}
                <div>
                  <div className="font-semibold mb-2">Chi tiết</div>

                  <div className="rounded-xl border border-gray-200 p-4 dark:border-zinc-600">
                    <div className="text-sm font-semibold">Mô tả</div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Mô tả video của bạn..."
                      className="mt-2 min-h-[130px] w-full resize-y bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-zinc-500"
                    />
                    <div className="mt-2 flex items-center justify-end text-xs text-gray-500 dark:text-zinc-400">
                      <div>{Math.min(description.length, 4000)}/4000</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-gray-200 p-4 dark:border-zinc-600">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">Ảnh bìa</div>
                      {coverFile ? (
                        <button
                          type="button"
                          onClick={() => setCover(null)}
                          className="flex cursor-pointer items-center gap-1 text-xs text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                        >
                          <X size={14} /> Xóa
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-start gap-5">
                      <div className="w-36 sm:w-44">
                        <div className="aspect-[9/16] overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800">
                          {effectiveCoverPreviewUrl ? (
                            <img
                              src={effectiveCoverPreviewUrl}
                              alt="cover"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-zinc-500">
                              <ImagePlus size={18} />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1">
                        <input
                          ref={pickCoverRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => acceptCover(e.target.files?.[0])}
                        />
                        <button
                          type="button"
                          onClick={onPickCover}
                          className="cursor-pointer rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:cursor-not-allowed dark:border-zinc-600 dark:hover:bg-zinc-800"
                          disabled={isUploading}
                        >
                          Chọn ảnh bìa
                        </button>
                        <div className="mt-2 text-xs text-gray-500 dark:text-zinc-400">
                          Chọn ảnh bìa để hiển thị cho video (tùy chọn).
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="mt-6 rounded-xl border border-gray-200 p-4 dark:border-zinc-600">
                  <div className="text-sm font-semibold">Xem trước</div>

                  <div className="mt-3 flex items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-black dark:border-zinc-600">
                    <video
                      src={videoPreviewUrl}
                      className="w-full max-h-[70vh] object-contain"
                      controls
                      playsInline
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={isUploading}
                    className="cursor-pointer rounded-lg border border-gray-200 px-5 py-2.5 font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={isUploading}
                    className="px-5 py-2.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-semibold disabled:opacity-60 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Upload size={18} />
                    Đăng tải
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

