import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { videosApi } from "../api/video.api";
import { useAuth } from "../context/AuthContext";
import { openAuthModal } from "../utils/authModalBus";
import { useMessageBox } from "./MessageBox";

const REPORT_REASONS = [
  { value: "spam", label: "Spam hoặc lừa đảo" },
  { value: "violence", label: "Bạo lực hoặc nguy hiểm" },
  { value: "harassment", label: "Quấy rối hoặc bắt nạt" },
  { value: "hate_speech", label: "Ngôn từ thù ghét" },
  { value: "nudity", label: "Nội dung nhạy cảm" },
  { value: "copyright", label: "Vi phạm bản quyền" },
  { value: "misinformation", label: "Thông tin sai lệch" },
  { value: "other", label: "Khác" },
];

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function ReportVideoModal({ open, video, onClose, onReported }) {
  const { isAuthenticated } = useAuth();
  const { show } = useMessageBox();
  const [reason, setReason] = useState(REPORT_REASONS[0].value);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const videoId = video?.id ?? null;
  const title = useMemo(() => {
    return String(video?.title || video?.description || "video này").trim();
  }, [video]);

  useEffect(() => {
    if (!open) return;
    setReason(REPORT_REASONS[0].value);
    setDescription("");
    setSubmitting(false);
  }, [open, videoId]);

  if (!open) return null;

  const submit = async () => {
    if (!videoId || submitting) return;
    if (!isAuthenticated) {
      onClose?.();
      openAuthModal();
      return;
    }

    setSubmitting(true);
    try {
      await videosApi.reportVideo({
        videoId,
        reason,
        description: description.trim(),
      });
      show({
        status: "success",
        title: "Đã gửi báo cáo",
        message: "Cảm ơn bạn. Người kiểm duyệt sẽ xem xét video này.",
      });
      onReported?.(videoId);
      onClose?.();
    } catch (err) {
      show({
        status: "error",
        title: "Không gửi được báo cáo",
        message: err?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
        aria-label="Đóng báo cáo"
        onClick={() => {
          if (!submitting) onClose?.();
        }}
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 dark:bg-zinc-950 dark:ring-white/10">
        <div className="flex items-start gap-3 border-b border-zinc-200/80 p-5 dark:border-white/10">
          <div className="min-w-0 flex-1">
            <div className="text-base font-extrabold text-zinc-950 dark:text-white">
              Báo cáo video
            </div>
            <div className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-white/55">
              {title}
            </div>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-white/65 dark:hover:bg-white/10 dark:hover:text-white"
            onClick={() => {
              if (!submitting) onClose?.();
            }}
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-2">
            {REPORT_REASONS.map((item) => {
              const active = reason === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  className={classNames(
                    "flex min-h-10 cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-semibold transition",
                    active
                      ? "border-rose-500 bg-rose-50 text-rose-700 dark:border-rose-400 dark:bg-rose-500/15 dark:text-rose-200"
                      : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
                  )}
                  onClick={() => setReason(item.value)}
                >
                  <span>{item.label}</span>
                  {active ? <span className="h-2 w-2 rounded-full bg-rose-500" /> : null}
                </button>
              );
            })}
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
            rows={3}
            placeholder="Mô tả thêm nếu cần..."
            className="w-full resize-none rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/15 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/35"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200/80 p-4 dark:border-white/10">
          <button
            type="button"
            className="h-10 cursor-pointer rounded-xl px-4 text-sm font-bold text-zinc-700 hover:bg-zinc-100 dark:text-white/75 dark:hover:bg-white/10"
            onClick={() => {
              if (!submitting) onClose?.();
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={submitting}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={submit}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Gửi báo cáo
          </button>
        </div>
      </div>
    </div>
  );
}
