import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { fullName } from "../../utils/chat";
import { messagesApi } from "../../api";
import { FileIcon, X, Loader2, PhoneOff, Video } from "lucide-react";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function ChatAttachment({ attachmentKey, attachmentType, attachmentName, isMine }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!attachmentKey || attachmentType !== "image") return;
    let alive = true;
    messagesApi.getDownloadPresignedUrl(attachmentKey, null)
      .then(res => {
        if (alive && res?.url) setUrl(res.url);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => { alive = false; };
  }, [attachmentKey, attachmentType]);

  if (error) {
    return <div className="text-xs text-red-500 italic mb-1">Không tải được đính kèm</div>;
  }

  if (attachmentType === "image") {
    if (!url) {
      return <div className="animate-pulse bg-black/10 dark:bg-white/10 rounded-2xl h-40 w-40 mb-1"></div>;
    }
    return (
      <>
        <div className="mb-1 overflow-hidden rounded-2xl">
          <img
            src={url}
            alt={attachmentName || "Attachment"}
            className="max-h-[300px] max-w-full object-cover cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => setIsFullscreen(true)}
          />
        </div>
        {isFullscreen && createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 cursor-zoom-out animate-in fade-in duration-200"
            onClick={() => setIsFullscreen(false)}
          >
            <img
              src={url}
              alt={attachmentName || "Attachment"}
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl cursor-default animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="absolute top-6 right-6 p-3 text-white/70 hover:text-white transition-colors cursor-pointer bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md"
              onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
              aria-label="Đóng"
            >
              <X className="h-8 w-8" />
            </button>
          </div>,
          document.body
        )}
      </>
    );
  }

  const handleDownloadFile = async (e) => {
    e.preventDefault();
    if (isDownloading) return;
    setIsDownloading(true);

    let presignedUrl = null;
    try {
      const resUrl = await messagesApi.getDownloadPresignedUrl(attachmentKey, attachmentName || "download");
      if (!resUrl?.url) throw new Error("Không lấy được link tải");

      presignedUrl = resUrl.url;

      const res = await fetch(presignedUrl);
      if (!res.ok) throw new Error("Tải file thất bại");

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = attachmentName || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Lỗi khi tải file", err);
      if (presignedUrl && err.message !== "Tải file thất bại") {
        window.open(presignedUrl, "_blank");
      } else {
        alert("Không thể tải file này. Vui lòng thử lại sau.");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      type="button"
      className={classNames(
        "mb-1 flex w-full cursor-pointer items-center gap-2 break-all rounded-xl p-3 text-left text-sm transition-colors relative",
        isMine
          ? "bg-white/90 text-gray-950 ring-1 ring-black/10 hover:bg-white dark:bg-white/20 dark:text-white dark:ring-white/10 dark:hover:bg-white/30"
          : "bg-gray-100 text-gray-900 ring-1 ring-black/10 hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:ring-white/10 dark:hover:bg-white/20",
        isDownloading ? "opacity-70 pointer-events-none" : ""
      )}
      onClick={handleDownloadFile}
      disabled={isDownloading}
    >
      <FileIcon className="h-5 w-5 shrink-0 text-gray-600 dark:text-white/80" />
      <span className="flex-1 truncate font-semibold text-gray-950 dark:text-white">{attachmentName || "Tải xuống file"}</span>
      {isDownloading && (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-500 dark:text-white/70" />
      )}
    </button>
  );
}

export default function MessageBubble({ msg, meId, conversation }) {
  const sender = msg?.sender ?? null;
  const isMine = !!meId && sender?.id === meId;
  const content = String(msg?.content ?? "").trim();
  const attachmentKey = msg?.attachmentKey || msg?.attachment_key;
  const attachmentType = msg?.attachmentType || msg?.attachment_type;
  const attachmentName = msg?.attachmentName || msg?.attachment_name;

  const isSystem = msg?.isSystem || msg?.is_system;

  if (isSystem) {
    return (
      <div className="flex justify-center w-full my-3 px-4">
        <div className="rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-white/10 px-4 py-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 max-w-[85%] text-center shadow-sm">
          {content}
        </div>
      </div>
    );
  }

  if (!content && !attachmentKey) return null;

  const avatar = sender?.avatarUrl || null;
  const initials = (() => {
    const f = String(sender?.firstName ?? "").trim();
    const l = String(sender?.lastName ?? "").trim();
    if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
    if (f) return f.slice(0, 2).toUpperCase();
    const u = String(sender?.username ?? "").trim();
    return u ? u.slice(0, 2).toUpperCase() : "?";
  })();

  const isOnlyImage = !content && attachmentType === "image";
  const isCallMissed = content.startsWith("[CALL_MISSED]");
  const isCallEnded = content.startsWith("[CALL_ENDED]");
  const isCallLog = isCallMissed || isCallEnded;
  const isFile = attachmentKey && attachmentType !== "image";

  return (
    <div
      className={classNames(
        "flex items-end gap-2",
        isMine ? "justify-end" : "justify-start"
      )}
    >
      {!isMine ? (
        avatar ? (
          <img
            src={avatar}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-200 text-[11px] font-bold text-gray-700 dark:bg-white/10 dark:text-white/80">
            {initials}
          </div>
        )
      ) : null}

      <div
        className={classNames(
          "max-w-[min(78%,44rem)] text-sm leading-snug shadow-sm transition-all",
          isOnlyImage ? "rounded-2xl overflow-hidden bg-transparent shadow-none" : "rounded-2xl px-3.5 py-2.5",
          // Call Missed: Red and bigger
          isCallMissed 
            ? "bg-red-500 text-white shadow-red-500/20 scale-[1.05] mx-2" 
            : isCallEnded
              ? "bg-emerald-600 text-white shadow-emerald-600/20"
              : isFile
                ? "bg-gray-100 text-gray-800 ring-1 ring-black/5 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10"
                : isMine
                  ? "bg-sky-500 text-white shadow-sky-500/10"
                  : "bg-white/70 text-gray-900 ring-1 ring-black/5 backdrop-blur-sm dark:bg-white/10 dark:text-white dark:ring-white/10"
        )}
        aria-label={sender ? fullName(sender) : "Tin nhắn"}
      >
        {attachmentKey && (
          <ChatAttachment
            attachmentKey={attachmentKey}
            attachmentType={attachmentType}
            attachmentName={attachmentName}
            isMine={isMine}
          />
        )}
        {content && (() => {
          if (isCallLog) {
            const duration = parseInt(content.split(" ")[1]) || 0;
            const mins = Math.floor(duration / 60);
            const secs = duration % 60;
            const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
            
            if (isCallMissed) {
              return (
                <div className="flex items-center gap-3 py-1.5 font-medium">
                  <PhoneOff className="h-5 w-5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-base leading-tight">Cuộc gọi nhỡ</span>
                    <span className="text-[11px] opacity-90">Đổ chuông {timeStr}</span>
                  </div>
                </div>
              );
            }
            if (isCallEnded) {
              return (
                <div className="flex items-center gap-3 py-1.5">
                  <Video className="h-5 w-5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-base font-bold leading-tight">Cuộc gọi video</span>
                    <span className="text-[11px] opacity-90">Thời lượng {timeStr}</span>
                  </div>
                </div>
              );
            }
          }
          return <div className="whitespace-pre-wrap">{content}</div>;
        })()}
      </div>
    </div>
  );
}

