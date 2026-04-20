import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import CommentsPanel from "./CommentsPanel";
import { commentsApi } from "../api/comments.api";
import { videosApi } from "../api/video.api";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { buildVideoSrc } from "../utils/feedVideo";
import { formatCount } from "../utils/format";
import { getUserAvatarUrl, getUserDisplayName } from "../utils/feedItem";
import { useAuth } from "../context/AuthContext";
import { openAuthModal } from "../utils/authModalBus";
import CommentReactButton from "./CommentReactButton";
import { MessageCircle } from "lucide-react";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

const MAX_COMMENT_CHARS = 1000;

export default function VideoViewerPanel({
  open = false,
  video,
  onClose,
  onCommentCreated,
}) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const { isAuthenticated } = useAuth();
  const [videoState, setVideoState] = useState(null);
  const [reacting, setReacting] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [mobileCommentsOpen, setMobileCommentsOpen] = useState(false);

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [composerSending, setComposerSending] = useState(false);
  const [composerBottom, setComposerBottom] = useState(0);
  const [incomingComment, setIncomingComment] = useState(null);
  const composerRef = useRef(null);

  const videoId = videoState?.id ?? video?.id ?? null;
  const src = useMemo(
    () => buildVideoSrc(videoState?.videoKey ?? video?.videoKey),
    [video?.videoKey, videoState?.videoKey]
  );
  const poster = videoState?.thumbnail || video?.thumbnail || undefined;

  const close = useCallback(() => onClose?.(), [onClose]);

  const authorName = useMemo(() => {
    return getUserDisplayName(videoState || video || {});
  }, [video, videoState]);

  const authorAvatarUrl = useMemo(() => {
    return getUserAvatarUrl(videoState || video || {});
  }, [video, videoState]);

  useEffect(() => {
    setVideoState(video || null);
    setDescExpanded(false);
    setMobileCommentsOpen(false);
  }, [video]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setShown(false);
      setComposerOpen(false);
      setComposerText("");
      setComposerSending(false);
      setComposerBottom(0);
      setIncomingComment(null);
      window.setTimeout(() => setShown(true), 16);
      return;
    }
    setShown(false);
    const t = window.setTimeout(() => setMounted(false), 260);
    return () => window.clearTimeout(t);
  }, [open]);

  const doReact = useCallback(
    async (reaction) => {
      if (!isAuthenticated) {
        openAuthModal();
        return;
      }
      if (!videoId || reacting) return;
      setReacting(true);
      try {
        const raw = await videosApi.reactToVideo(videoId, reaction);
        setVideoState((prev) => {
          const base = prev || video || {};
          return {
            ...base,
            myReaction: raw?.reaction ?? null,
            reactionCount: raw?.reactionCount ?? raw?.reaction_count ?? base.reactionCount ?? 0,
          };
        });
      } finally {
        setReacting(false);
      }
    },
    [isAuthenticated, reacting, video, videoId]
  );

  useEffect(() => {
    if (!composerOpen) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setComposerBottom(kb);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [composerOpen]);

  useEffect(() => {
    if (!composerOpen) return;
    window.setTimeout(() => composerRef.current?.focus?.(), 0);
  }, [composerOpen]);

  const sendComposer = useCallback(async () => {
    if (!videoId) return;
    const text = composerText.trim();
    if (!text || composerSending) return;
    if (text.length > MAX_COMMENT_CHARS) return;
    setComposerSending(true);
    try {
      const created = await commentsApi.create({ videoId, content: text });
      if (created) {
        setIncomingComment(created);
        onCommentCreated?.(created);
        setComposerText("");
        setComposerOpen(false);
      }
    } finally {
      setComposerSending(false);
    }
  }, [composerSending, composerText, onCommentCreated, videoId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, open]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        className={classNames(
          "absolute inset-0 bg-black/50 backdrop-blur-[1px] transition-opacity",
          shown ? "opacity-100" : "opacity-0"
        )}
        aria-label="Đóng"
        onClick={close}
      />

      <div
        className={classNames(
          "absolute bg-white shadow-2xl dark:bg-black border border-black/10 ring-1 ring-black/5 dark:border-white/20 dark:ring-white/10",
          // Mobile: full screen. Desktop: centered panel (horizontally).
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
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-zinc-200/80 px-4 py-3 dark:border-white/10">
            <button
              type="button"
              aria-label="Đóng"
              onClick={close}
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 active:bg-zinc-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 dark:active:bg-white/20"
            >
              <X size={18} />
            </button>
            <div className="h-9 w-9" aria-hidden />
          </div>

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div
              className={classNames(
                "relative flex min-h-0 flex-1 items-center justify-center bg-black overflow-hidden",
                "transition-[flex-basis,opacity] duration-300 ease-out will-change-[flex-basis,opacity]",
                // Mobile: open comments -> collapse + fade video (smooth).
                mobileCommentsOpen
                  ? "max-lg:flex-[0_0_0px] max-lg:opacity-0 max-lg:pointer-events-none"
                  : "max-lg:flex-[0_0_48dvh] max-lg:opacity-100"
              )}
            >
              {src ? (
                <video
                  className="h-full w-full object-contain"
                  src={src}
                  poster={poster}
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : (
                <div className="px-4 py-10 text-center text-sm text-white/70">
                  Không có nguồn video.
                </div>
              )}

              <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white">
                {formatCount(video?.viewCount ?? 0)} lượt xem
              </div>
            </div>

            <div className="min-h-0 w-full flex-1 lg:w-[420px] lg:flex-none">
              <div className="flex h-full min-h-0 w-full flex-col">
                <div
                  className={classNames(
                    "border-t border-zinc-200/90 bg-white px-4 py-3 dark:border-white/10 dark:bg-black lg:border-t-0 lg:border-l",
                    // Fixed-ish height on desktop; a bit taller.
                    "lg:flex-none lg:min-h-[140px] lg:max-h-[200px]"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {authorAvatarUrl ? (
                      <img
                        src={authorAvatarUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-200 dark:bg-white/10" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold text-zinc-900 dark:text-white">
                        {authorName}
                      </div>
                      <div
                        className={classNames(
                          "mt-1 whitespace-pre-wrap break-words text-sm text-zinc-700 dark:text-white/75",
                          descExpanded
                            ? "max-h-[120px] overflow-y-auto pr-2"
                            : "line-clamp-3"
                        )}
                        onScroll={() => {
                          if (isDesktop) return;
                          setMobileCommentsExpanded(true);
                        }}
                      >
                        {videoState?.description || "—"}
                      </div>
                      {(videoState?.description || "").length > 140 ? (
                        <button
                          type="button"
                          className="mt-1 cursor-pointer text-xs font-semibold text-pink-600 hover:text-pink-500 dark:text-pink-400 dark:hover:text-pink-300"
                          onClick={() => setDescExpanded((v) => !v)}
                        >
                          {descExpanded ? "Thu gọn" : "Xem thêm"}
                        </button>
                      ) : null}

                      {/* Mobile: open comments on explicit click (no scroll-driven behavior). */}
                      {!isDesktop && !mobileCommentsOpen ? (
                        <div className="mt-3 flex items-center gap-3">
                          <CommentReactButton
                            myReaction={videoState?.myReaction ?? null}
                            reactionCount={videoState?.reactionCount ?? 0}
                            disabled={reacting}
                            onReact={doReact}
                            onRequireAuth={openAuthModal}
                          />
                          <button
                            type="button"
                            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 active:bg-zinc-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 dark:active:bg-white/20"
                            onClick={() => setMobileCommentsOpen(true)}
                            aria-label="Mở bình luận"
                          >
                            <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
                            <span>Bình luận</span>
                            <span className="ml-1 text-zinc-500 dark:text-white/60">|</span>
                            <span className="text-zinc-700 dark:text-white/80">
                              {formatCount(videoState?.commentCount ?? 0)}
                            </span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {(isDesktop || mobileCommentsOpen) && (
                  <CommentsPanel
                    open={open && (isDesktop || mobileCommentsOpen)}
                    onClose={isDesktop ? close : () => setMobileCommentsOpen(false)}
                    videoId={videoId}
                    onCommentCreated={(created) => {
                      onCommentCreated?.(created);
                      setVideoState((prev) => {
                        if (!prev) return prev;
                        const cur =
                          typeof prev.commentCount === "number" ? prev.commentCount : 0;
                        return { ...prev, commentCount: cur + 1 };
                      });
                    }}
                    onRequestMobileComposer={() => {
                      if (isDesktop) return;
                      setComposerOpen(true);
                    }}
                    incomingComment={incomingComment}
                    headerLeft={
                      <CommentReactButton
                        myReaction={videoState?.myReaction ?? null}
                        reactionCount={videoState?.reactionCount ?? 0}
                        disabled={reacting}
                        onReact={doReact}
                        onRequireAuth={openAuthModal}
                      />
                    }
                    showCloseButton={false}
                    headerRight={
                      !isDesktop ? (
                        <button
                          type="button"
                          aria-label="Đóng bình luận"
                          onClick={() => setMobileCommentsOpen(false)}
                          className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 active:bg-zinc-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 dark:active:bg-white/20"
                        >
                          <X size={18} />
                        </button>
                      ) : null
                    }
                    border="none"
                    className="min-h-0 flex-1 border-t border-zinc-200/90 dark:border-white/10 lg:border-t-0 lg:border-l"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile composer: sits above keyboard (TikTok-like). */}
      {composerOpen && !isDesktop ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Đóng ô nhập bình luận"
            onClick={() => setComposerOpen(false)}
          />
          <div
            className="absolute left-0 right-0"
            style={{ bottom: composerBottom }}
          >
            <div className="mx-auto w-full max-w-[640px] px-3 pb-3">
              <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/80 p-2.5 backdrop-blur-md">
                <textarea
                  ref={composerRef}
                  value={composerText}
                  onChange={(e) =>
                    setComposerText(e.target.value.slice(0, MAX_COMMENT_CHARS))
                  }
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    if (e.shiftKey) return;
                    e.preventDefault();
                    sendComposer();
                  }}
                  rows={1}
                  placeholder="Viết bình luận..."
                  className="min-h-[44px] flex-1 resize-none overflow-hidden bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-white/50"
                />
                <button
                  type="button"
                  onClick={sendComposer}
                  disabled={!composerText.trim() || composerSending}
                  className={classNames(
                    "h-[44px] shrink-0 rounded-xl px-4 text-sm font-semibold text-white transition",
                    composerText.trim() && !composerSending
                      ? "bg-pink-500 hover:bg-pink-600 active:bg-pink-700"
                      : "cursor-not-allowed bg-white/15"
                  )}
                >
                  {composerSending ? "Đang gửi..." : "Gửi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

