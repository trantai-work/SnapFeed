import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MessageCircle, X } from "lucide-react";
import { commentsApi } from "../../api/comments.api";
import { buildVideoSrc } from "../../utils/feedVideo";
import { formatRelativeTimeVi } from "../../utils/format";
import { getUserAvatarUrl, getUserDisplayName } from "../../utils/feedItem";
import HLSVideoPlayer from "../HLSVideoPlayer";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
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
  const timeLabel = formatRelativeTimeVi(c?.createdAt);
  const [expanded, setExpanded] = useState(false);
  const { short, clipped } = useMemo(
    () => excerptText(c?.content || "", 220),
    [c?.content]
  );

  return (
    <div className="flex gap-3 py-3 text-left">
      <div className="shrink-0">
        {c?.user?.avatarUrl ? (
          <img
            src={c.user.avatarUrl}
            alt=""
            className="h-9 w-9 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-zinc-200" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <div className="truncate text-sm font-semibold text-zinc-900">
            {name}
          </div>
          <div className="shrink-0 text-xs text-zinc-500">
            {timeLabel}
          </div>
        </div>
        <div className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-800">
          {expanded || !clipped ? (c?.content || "") : short}
        </div>
        {clipped ? (
          <button
            type="button"
            className="mt-1 cursor-pointer text-xs font-semibold text-pink-600 hover:text-pink-500"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Thu gọn" : "Xem thêm"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function ModeratorVideoReviewModal({ open, video, onClose }) {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [comments, setComments] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const listRef = useRef(null);

  const videoId = video?.id ?? null;
  const src = video?.videoKey ? buildVideoSrc(video.videoKey) : null;
  const hlsUrl =
    video?.status === "ready" && video?.hlsPlaylistKey
      ? buildVideoSrc(video.hlsPlaylistKey)
      : null;
  const authorName = useMemo(() => getUserDisplayName(video || {}), [video]);
  const authorAvatarUrl = useMemo(() => getUserAvatarUrl(video || {}), [video]);
  const titleText = String(video?.title || "").trim();
  const descriptionText = String(video?.description || "").trim();
  const createdAtLabel = useMemo(() => formatRelativeTimeVi(video?.createdAt), [video]);

  const tagList = useMemo(() => {
    const raw = video?.tags;
    return Array.isArray(raw)
      ? raw.map((tag) => String(tag).trim()).filter(Boolean)
      : String(raw || "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
  }, [video?.tags]);

  const loadComments = useCallback(async () => {
    if (!open || !videoId) return;
    setLoadingComments(true);
    try {
      const page = await commentsApi.listModeratorComments({ videoId, pageSize: 30 });
      setComments(page.results || []);
      setNextCursor(page.nextCursor || null);
    } finally {
      setLoadingComments(false);
    }
  }, [open, videoId]);

  const loadMoreComments = useCallback(async () => {
    if (!open || !videoId || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await commentsApi.listModeratorComments({ videoId, cursor: nextCursor, pageSize: 30 });
      setComments((prev) => [...prev, ...(page.results || [])]);
      setNextCursor(page.nextCursor || null);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor, open, videoId]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setShown(false);
      setDescExpanded(false);
      setComments([]);
      setNextCursor(null);
      loadComments();
      window.setTimeout(() => setShown(true), 16);
      return;
    }
    setShown(false);
    const t = window.setTimeout(() => setMounted(false), 260);
    return () => window.clearTimeout(t);
  }, [open, loadComments]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  const onScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const canLoadMore = !!nextCursor && !loadingMore;
    if (!canLoadMore) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining < 240) loadMoreComments();
  }, [nextCursor, loadingMore, loadMoreComments]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        className={classNames(
          "absolute inset-0 bg-black/50 backdrop-blur-[1px] transition-opacity duration-300",
          shown ? "opacity-100" : "opacity-0"
        )}
        aria-label="Đóng"
        onClick={onClose}
      />

      <div
        className={classNames(
          "absolute bg-white shadow-2xl border border-black/10 ring-1 ring-black/5",
          "max-lg:inset-0 max-lg:w-full lg:inset-y-0 lg:left-1/2 lg:w-[min(1200px,96vw)] lg:-translate-x-1/2",
          "overflow-hidden max-lg:rounded-none lg:rounded-3xl",
          "transition-[transform,opacity] duration-300 ease-out will-change-[transform,opacity]",
          shown
            ? "max-lg:translate-x-0 lg:opacity-100 lg:scale-100"
            : "max-lg:translate-x-full lg:opacity-0 lg:scale-95"
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="relative flex h-full min-h-0 flex-col">
          {/* Floating close button - beautiful and sleek */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-50 grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-zinc-900/10 text-zinc-800 backdrop-blur-md transition hover:bg-zinc-900/20 active:bg-zinc-900/30"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black overflow-hidden max-lg:flex-[0_0_48dvh]">
              {src || hlsUrl ? (
                <HLSVideoPlayer
                  className="h-full w-full object-contain"
                  src={src}
                  hlsUrl={hlsUrl}
                  poster={video?.thumbnail || undefined}
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : (
                <div className="px-6 text-center text-sm text-white/70">
                  Không có nguồn video.
                </div>
              )}
            </div>

            <div className="min-h-0 w-full flex-1 lg:w-[420px] lg:flex-none">
              <div className="flex h-full min-h-0 w-full flex-col">
                <div className="border-t border-zinc-200/90 bg-white px-4 py-3 lg:border-t-0 lg:border-l lg:flex-none lg:min-h-[140px] lg:max-h-[200px] pr-16">
                  <div className="flex items-start gap-3 text-left">
                    {authorAvatarUrl ? (
                      <img
                        src={authorAvatarUrl}
                        alt=""
                        onClick={() => {
                          if (video?.user) {
                            onClose?.();
                            navigate(`/profile/${video.user}`);
                          }
                        }}
                        className="h-10 w-10 shrink-0 cursor-pointer rounded-full object-cover ring-1 ring-black/5 hover:opacity-80 transition"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-200" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold text-zinc-900">
                        <span
                          onClick={() => {
                            if (video?.user) {
                              onClose?.();
                              navigate(`/profile/${video.user}`);
                            }
                          }}
                          className="cursor-pointer hover:text-pink-600 hover:underline"
                        >
                          {authorName}
                        </span>
                        {createdAtLabel ? (
                          <span className="ml-1 font-semibold text-zinc-500">
                            · {createdAtLabel}
                          </span>
                        ) : null}
                      </div>
                      {titleText ? (
                        <div className="mt-0.5 line-clamp-1 text-sm font-extrabold text-zinc-900">
                          {titleText}
                        </div>
                      ) : null}
                      <div
                        className={classNames(
                          "mt-1 whitespace-pre-wrap break-words text-sm text-zinc-700",
                          descExpanded ? "max-h-[120px] overflow-y-auto pr-2" : "line-clamp-3"
                        )}
                      >
                        {descriptionText || "—"}
                      </div>
                      {descriptionText.length > 140 ? (
                        <button
                          type="button"
                          className="mt-1 cursor-pointer text-xs font-semibold text-pink-600 hover:text-pink-500"
                          onClick={() => setDescExpanded((v) => !v)}
                        >
                          {descExpanded ? "Thu gọn" : "Xem thêm"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {tagList.length > 0 ? (
                  <div className="border-t border-zinc-200/90 bg-white px-4 py-2 lg:border-l lg:border-t-0">
                    <div className="flex flex-wrap gap-1.5">
                      {tagList.slice(0, 6).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-800"
                        >
                          #{t}
                        </span>
                      ))}
                      {tagList.length > 6 ? (
                        <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-800">
                          +{tagList.length - 6}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden bg-white shadow-2xl border-t border-zinc-200/90 lg:border-t-0 lg:border-l">
                  <div className="flex items-center justify-between border-b border-zinc-200/80 bg-white px-4 py-3">
                    <div className="w-9" aria-hidden />
                    <div className="text-sm font-semibold text-zinc-900">
                      Bình luận
                    </div>
                    <div className="w-9" aria-hidden />
                  </div>

                  <div
                    ref={listRef}
                    className="comments-scroll min-h-0 flex-1 overflow-y-auto px-4"
                    onScroll={onScroll}
                  >
                    {loadingComments ? (
                      <div className="flex h-full items-center justify-center py-10 text-zinc-500">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Đang tải bình luận...
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
                        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-zinc-100 text-zinc-500">
                          <MessageCircle size={26} strokeWidth={1.75} aria-hidden />
                        </div>
                        <div className="text-sm font-semibold text-zinc-700">
                          Chưa có bình luận nào
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-200/70">
                        {comments.map((c) => (
                          <CommentRow key={c.id} c={c} />
                        ))}
                      </div>
                    )}

                    {loadingMore ? (
                      <div className="flex items-center justify-center py-4 text-zinc-500">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang tải thêm...
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
