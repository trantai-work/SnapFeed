import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, FileVideo, MonitorPlay, Frame, Ratio } from "lucide-react";
import { useMessageBox } from "../MessageBox";
import { useUploadDraft } from "../../context/UploadDraftContext";

const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB — must match backend policy

export default function UploadContent() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const { show } = useMessageBox();
  const { setVideo } = useUploadDraft();

  const helperText = useMemo(() => {
    if (!file) return "Hoặc kéo và thả vào đây";
    return `${file.name} • ${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  }, [file]);

  const onPick = () => {
    inputRef.current && (inputRef.current.value = "", inputRef.current.click());
  };

  const acceptFile = async (f) => {
    if (!f) return;

    const isMp4 =
      String(f.type).toLowerCase() === "video/mp4" ||
      String(f.name).toLowerCase().endsWith(".mp4");

    if (!isMp4) {
      inputRef.current && (inputRef.current.value = "");
      setFile(null);
      show({ status: "warning", message: "Không hỗ trợ file có định dạng này" });
      return;
    }

    if (f.size > MAX_VIDEO_SIZE) {
      inputRef.current && (inputRef.current.value = "");
      setFile(null);
      show({
        status: "warning",
        title: "File quá lớn",
        message: `Video không được vượt quá 500MB. File của bạn: ${(f.size / (1024 * 1024)).toFixed(1)}MB`,
      });
      return;
    }

    setFile(f);
    setVideo(f);
    navigate("/upload/video");
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer?.files?.[0];
    acceptFile(f);
  };

  return (
    <div className="w-full">
      <div className="mx-auto mt-4 max-w-6xl sm:mt-8 lg:mt-10">
        <div className="rounded-2xl bg-white p-4 text-gray-900 shadow-sm dark:bg-zinc-900 dark:text-white sm:p-8 md:p-16">
          <div
            className={[
              "min-h-[260px] cursor-pointer rounded-2xl border-2 border-dashed sm:min-h-[380px]",
              isDragging
                ? "border-pink-500 bg-pink-50/60 dark:bg-pink-950/40"
                : "border-gray-200 dark:border-zinc-600",
              "box-border min-w-full transition-colors",
            ].join(" ")}
            onDragEnter={e => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            onDragOver={e => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            onDragLeave={e => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
            }}
            onDrop={onDrop}
            onClick={e => {
              if (e.target !== e.currentTarget) return;
              onPick();
            }}
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") {
                onPick();
              }
            }}
          >
            <div className="flex flex-col items-center justify-center bg-gray-100 px-4 py-16 text-center dark:bg-zinc-800/80 sm:px-9 sm:py-24">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white dark:bg-zinc-700">
                <UploadCloud className="text-gray-500 dark:text-zinc-400" size={34} />
              </div>

              <div className="mb-2 text-xl font-semibold">Chọn video để tải lên</div>
              <div className="mb-6 text-base text-gray-500 dark:text-zinc-400">{helperText}</div>

              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={e => acceptFile(e.target.files?.[0])}
              />

              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onPick();
                }}
                disabled={false}
                className={[
                  "px-10 py-3 rounded-lg text-white font-semibold transition-colors text-base",
                  "bg-pink-500 hover:bg-pink-600",
                ].join(" ")}
                style={{ cursor: "pointer" }}
              >
                Chọn video
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 text-left sm:mt-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            <InfoCard
              icon={<FileVideo size={20} className="text-gray-700 dark:text-zinc-300" />}
              title="Dung lượng và thời lượng"
              desc="Dung lượng tối đa: 500 MB"
            />
            <InfoCard
              icon={<Frame size={20} className="text-gray-700 dark:text-zinc-300" />}
              title="Định dạng tập tin"
              desc='Đề xuất: "mp4".'
            />
            <InfoCard
              icon={<MonitorPlay size={20} className="text-gray-700 dark:text-zinc-300" />}
              title="Độ phân giải video"
              desc="Độ phân giải cao khuyến nghị: 1080p, 1440p."
            />
            <InfoCard
              icon={<Ratio size={20} className="text-gray-700 dark:text-zinc-300" />}
              title="Tỷ lệ khung hình"
              desc="Đề xuất: 16:9 cho chế độ ngang, 9:16 cho chế độ dọc."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, desc }) {
  return (
    <div className="flex gap-4 p-4">
      <div className="mt-0.5">{icon}</div>
      <div>
        <div className="text-base font-semibold">{title}</div>
        <div className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-zinc-400">{desc}</div>
      </div>
    </div>
  );
}
