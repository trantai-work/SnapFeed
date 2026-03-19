import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, FileVideo, MonitorPlay, Frame, Ratio } from "lucide-react";
import { useMessageBox } from "../MessageBox";
import { useUploadDraft } from "../../context/UploadDraftContext";

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
      <div className="max-w-6xl mx-auto mt-10">
        <div className="bg-white text-black rounded-2xl p-8 md:p-16 shadow-sm">
          <div
            className={[
              "rounded-2xl border-2 border-dashed",
              isDragging ? "border-pink-500 bg-pink-50/60" : "border-gray-200",
              "transition-colors",
            ].join(" ")}
            style={{
              cursor: "pointer",
              minHeight: "380px",
              height: "auto",
              minWidth: "100%",
              boxSizing: "border-box",
            }}
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
            <div
              className="flex flex-col items-center justify-center text-center px-9 py-24"
              style={{ background: "#f8f8f8" }}
            >
              <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                <UploadCloud className="text-gray-500" size={34} />
              </div>

              <div className="text-xl font-semibold mb-2">Chọn video để tải lên</div>
              <div className="text-base text-gray-500 mb-6">{helperText}</div>

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

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <InfoCard
              icon={<FileVideo size={20} className="text-gray-700" />}
              title="Dung lượng và thời lượng"
              desc="Dung lượng tối đa: 3 GB"
            />
            <InfoCard
              icon={<Frame size={20} className="text-gray-700" />}
              title="Định dạng tập tin"
              desc='Đề xuất: "mp4".'
            />
            <InfoCard
              icon={<MonitorPlay size={20} className="text-gray-700" />}
              title="Độ phân giải video"
              desc="Độ phân giải cao khuyến nghị: 1080p, 1440p."
            />
            <InfoCard
              icon={<Ratio size={20} className="text-gray-700" />}
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
        <div className="font-semibold text-base">{title}</div>
        <div className="text-sm text-gray-500 mt-1 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}
