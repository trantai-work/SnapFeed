import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useMessageBox } from "./MessageBox";
import { commentsApi } from "../api/comments.api";
import { formatNotificationTime } from "../utils/notificationItem";

const MAX_COMMENT_CHARS = 1000;

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function countChars(text) {
  return String(text || "").length;
}

function excerptText(text, maxChars = 220) {
  const s = String(text || "").trim();
  if (s.length <= maxChars) return { short: s, clipped: false };
  return { short: `${s.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`, clipped: true };
}

function CommentRow({ c }) {
  const name = c?.user
    ? `${c.user.firstName || ""} ${c.user.lastName || ""}`.trim() ||
      c.user.username ||
      "Người dùng"
    : "Người dùng";
  const timeLabel = formatNotificationTime(c?.createdAt);
  const [expanded, setExpanded] = useState(false);
  const { short, clipped } = useMemo(
    () => excerptText(c?.content || "", 220),
    [c?.content]
  );

  return (
    <div className="flex gap-3 py-3">
      <div className="shrink-0">
        {c?.user?.avatarUrl ? (
          <img
            src={c.user.avatarUrl}
            alt=""
            className="h-9 w-9 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-white/10" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <div className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
            {name}
          </div>
          <div className="shrink-0 text-xs text-zinc-500 dark:text-white/50">
            {timeLabel}
          </div>
        </div>
        <div className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-800 dark:text-white/85">
          {expanded || !clipped ? (c?.content || "") : short}
        </div>
        {clipped ? (
          <button
            type="button"
            className="mt-1 cursor-pointer text-xs font-semibold text-pink-600 hover:text-pink-500 dark:text-pink-400 dark:hover:text-pink-300"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Thu gọn" : "Xem thêm"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function CommentsPanel({
  open = false,
  onClose,
  videoId,
  onCommentCreated,
  onRequestMobileComposer,
  incomingComment,
  className,
  border = "left", // left | top | none
  headerLeft = null,
  headerRight = null,
  showCloseButton = true,
  title = "Bình luận",
  onListScroll,
}) {
  const { isAuthenticated } = useAuth();
  const { show } = useMessageBox();
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inFlightRef = useRef(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const canLoadMore = !!nextCursor && !loadingMore;

  const loadInitial = useCallback(async () => {
    if (!open || !videoId || inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    try {
      const res = await commentsApi.list({ videoId });
      setItems(res.results || []);
      setNextCursor(res.nextCursor || null);
    } catch (e) {
      show({ status: "error", title: "Lỗi", message: e?.message || "" });
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [open, show, videoId]);

  const loadMore = useCallback(async () => {
    if (!open || !videoId || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await commentsApi.list({ videoId, cursor: nextCursor });
      setItems((prev) => [...prev, ...(res.results || [])]);
      setNextCursor(res.nextCursor || null);
    } catch (e) {
      show({ status: "error", title: "Lỗi", message: e?.message || "" });
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor, open, show, videoId]);

  useEffect(() => {
    if (!open) return;
    setItems([]);
    setNextCursor(null);
    setContent("");
    setSubmitting(false);
    inFlightRef.current = false;
    loadInitial();
  }, [open, loadInitial, videoId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!incomingComment || !videoId) return;
    const vid = incomingComment.video;
    if (vid !== videoId) return;
    setItems((prev) => {
      if (prev.some((x) => x?.id === incomingComment.id)) return prev;
      return [incomingComment, ...prev];
    });
  }, [incomingComment, videoId]);

  const onScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    onListScroll?.(el.scrollTop);
    if (!canLoadMore) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining < 240) loadMore();
  }, [canLoadMore, loadMore, onListScroll]);

  const canSubmit = useMemo(() => {
    const t = (content || "").trim();
    return !!t && !submitting;
  }, [content, submitting]);

  const resizeInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxPx = 44 * 4; // ~4 lines cap (simple, consistent)
    el.style.height = `${Math.min(el.scrollHeight, maxPx)}px`;
  }, []);

  const submit = useCallback(async () => {
    if (!isAuthenticated) return;
    const t = (content || "").trim();
    if (!t || submitting || !videoId) return;
    const cc = countChars(t);
    if (cc > MAX_COMMENT_CHARS) {
      show({
        status: "warning",
        title: "Bình luận quá dài",
        message: `Tối đa ${MAX_COMMENT_CHARS} ký tự. Hiện tại: ${cc} ký tự.`,
      });
      return;
    }
    setSubmitting(true);
    try {
      const created = await commentsApi.create({ videoId, content: t });
      if (created) {
        setItems((prev) => [created, ...prev]);
        setContent("");
        onCommentCreated?.(created);
      }
    } catch (e) {
      show({ status: "error", title: "Lỗi", message: e?.message || "" });
    } finally {
      setSubmitting(false);
    }
  }, [content, isAuthenticated, onCommentCreated, show, submitting, videoId]);

  useEffect(() => {
    resizeInput();
  }, [content, resizeInput]);

  const borderClass =
    border === "left"
      ? "border-l border-zinc-200/90 dark:border-white/10"
      : border === "top"
        ? "border-t border-zinc-200/90 dark:border-white/10"
        : "";

  const wrapClass = classNames(
    "relative flex h-full w-full flex-col overflow-hidden",
    borderClass,
    "bg-white shadow-2xl dark:bg-black",
    className
  );

  return (
    <div className={wrapClass}>
      <div className="flex items-center justify-between border-b border-zinc-200/80 px-4 py-3 dark:border-white/10">
        {headerLeft ? (
          <div className="h-9">{headerLeft}</div>
        ) : showCloseButton ? (
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => onClose?.()}
            className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 active:bg-zinc-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 dark:active:bg-white/20"
          >
            <X size={18} />
          </button>
        ) : (
          <div className="h-9 w-9" aria-hidden />
        )}
        <div className="text-sm font-semibold text-zinc-900 dark:text-white">
          {title}
        </div>
        {headerRight ? (
          <div className="h-9">{headerRight}</div>
        ) : (
          <div className="h-9 w-9" aria-hidden />
        )}
      </div>

      <div
        ref={listRef}
        className="comments-scroll min-h-0 flex-1 overflow-y-auto px-4"
        onScroll={onScroll}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center py-10 text-zinc-500 dark:text-white/60">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Đang tải bình luận...
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-white/60">
              <MessageCircle size={26} strokeWidth={1.75} aria-hidden />
            </div>
            <div className="text-sm font-semibold text-zinc-700 dark:text-white/75">
              Chưa có bình luận nào
            </div>
            <div className="text-sm text-zinc-500 dark:text-white/55">
              Hãy là người đầu tiên bình luận.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200/70 dark:divide-white/10">
            {items.map((c) => (
              <CommentRow key={c.id} c={c} />
            ))}
          </div>
        )}

        {loadingMore ? (
          <div className="flex items-center justify-center py-4 text-zinc-500 dark:text-white/60">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Đang tải thêm...
          </div>
        ) : null}
      </div>

      <div
        className="border-t border-zinc-200/80 px-4 pt-3 pb-6 dark:border-white/10"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 32px)" }}
      >
        {!isAuthenticated ? (
          <div className="text-sm text-zinc-600 dark:text-white/70">
            Bạn cần đăng nhập để bình luận.
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_COMMENT_CHARS))}
              onFocus={() => {
                onRequestMobileComposer?.();
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                if (e.shiftKey) return;
                e.preventDefault();
                submit();
              }}
              rows={1}
              placeholder="Viết bình luận..."
              maxLength={MAX_COMMENT_CHARS}
              className="min-h-[44px] flex-1 resize-none overflow-hidden rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-500/20 dark:border-white/10 dark:bg-black dark:text-white dark:focus:border-pink-400"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className={classNames(
                "h-[44px] shrink-0 rounded-xl px-4 text-sm font-semibold text-white transition",
                canSubmit
                  ? "bg-pink-500 hover:bg-pink-600 active:bg-pink-700"
                  : "cursor-not-allowed bg-zinc-300 dark:bg-white/15"
              )}
            >
              {submitting ? "Đang gửi..." : "Gửi"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

