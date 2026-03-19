import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ImagePlus, RefreshCcw, Upload, X } from "lucide-react";
import { uploadToS3, videosApi } from "../api/video.api";
import { useMessageBox } from "../components/MessageBox";
import { useUploadDraft } from "../context/UploadDraftContext";
import logo from "../assets/logo_no_text.png";
import { getVideoDurationSeconds, getVideoFirstFrameJpegFile } from "../utils/video";

export default function VideoUploadPage() {
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

      let thumbnailFile = coverFile || undefined;
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

  // Custom styles for topbar and sidebar
  const fixedBarStyle = {
    backgroundColor: "#f9fafb",
  };

  if (!videoFile) {
    return (
      <div className="h-screen bg-gray-50 overflow-hidden">
        {/* Topbar (fixed) */}
        <div
          className="fixed top-0 left-0 right-0 h-[72px] border-b border-gray-200 flex items-center px-6 z-20"
          style={fixedBarStyle}
        >
          <img
            src={logo}
            alt="SnapFeed"
            className="h-18 w-auto object-contain"
          />
        </div>

        {/* Sidebar (fixed) */}
        <div
          className="hidden lg:block fixed top-[72px] bottom-0 left-0 w-[260px] border-r border-gray-200 z-10"
          style={fixedBarStyle}
        />

        {/* Main scroll area */}
        <div className="pt-[72px] lg:pl-[260px] h-full">
          <div className="h-[calc(100vh-72px)] overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto mt-4">
              <div className="bg-white text-black rounded-2xl p-8 shadow-sm">
                <div className="text-lg font-semibold">
                  Chưa có video để tải lên
                </div>
                <div className="text-sm text-gray-600 mt-1">
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
    <div className="h-screen bg-gray-50 overflow-hidden">
      {/* Topbar (fixed) */}
      <div
        className="fixed top-0 left-0 right-0 h-[72px] border-b border-gray-200 flex items-center px-6 z-20"
        style={fixedBarStyle}
      >
        <img
          src={logo}
          alt="SnapFeed"
          className="h-18 w-auto object-contain"
        />
      </div>

      {/* Sidebar (fixed) */}
      <div
        className="hidden lg:block fixed top-[72px] bottom-0 left-0 w-[260px] border-r border-gray-200 z-10"
        style={fixedBarStyle}
      />

      {/* Main scroll area */}
      <div className="pt-[72px] lg:pl-[260px] h-full">
        <div className="h-[calc(100vh-72px)] overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto mt-4">
            <div className="bg-white text-black rounded-2xl p-6 md:p-8 shadow-sm">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="font-semibold truncate">{videoFile.name}</div>
                      <span className="text-[11px] leading-5 px-2 rounded-full bg-gray-100 text-gray-600 shrink-0">
                        {videoFile.type || "video/mp4"}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
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
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm font-semibold disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <RefreshCcw size={16} className="text-gray-700" />
                      Thay thế
                    </button>
                  </div>
                </div>

                {/* Thanh progress: nằm ngoài, kéo dài full header */}
                <div className="mt-3 h-[3px] w-full rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full bg-emerald-500 w-full" />
                </div>
              </div>

              {/* Content */}
              <div className="mt-6">
                {/* Details */}
                <div>
                  <div className="font-semibold mb-2">Chi tiết</div>

                  <div className="border border-gray-200 rounded-xl p-4">
                    <div className="text-sm font-semibold">Mô tả</div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Mô tả video của bạn..."
                      className="mt-2 w-full min-h-[130px] resize-y outline-none text-sm"
                    />
                    <div className="flex items-center justify-end mt-2 text-xs text-gray-500">
                      <div>{Math.min(description.length, 4000)}/4000</div>
                    </div>
                  </div>

                  <div className="mt-4 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">Ảnh bìa</div>
                      {coverFile ? (
                        <button
                          type="button"
                          onClick={() => setCover(null)}
                          className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1 cursor-pointer"
                        >
                          <X size={14} /> Xóa
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-start gap-5">
                      <div className="w-36 sm:w-44">
                        <div className="aspect-[9/16] rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                          {coverPreviewUrl ? (
                            <img
                              src={coverPreviewUrl}
                              alt="cover"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
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
                          className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-semibold cursor-pointer disabled:cursor-not-allowed"
                          disabled={isUploading}
                        >
                          Chọn ảnh bìa
                        </button>
                        <div className="text-xs text-gray-500 mt-2">
                          Chọn ảnh bìa để hiển thị cho video (tùy chọn).
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="mt-6 border border-gray-200 rounded-xl p-4">
                  <div className="text-sm font-semibold">Xem trước</div>

                  <div className="mt-3 rounded-2xl border border-gray-200 overflow-hidden bg-black flex items-center justify-center">
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
                    className="px-5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 font-semibold disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
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

