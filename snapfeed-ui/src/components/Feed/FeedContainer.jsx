import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RotateCw, X } from "lucide-react";
import { useFeedItems } from "../../hooks/useFeedItems";
import { FeedList } from "./FeedList";
import { useAuth } from "../../context/AuthContext";
import CommentsPanel from "../CommentsPanel";
import ReportVideoModal from "../ReportVideoModal";
import ShareModal from "../chats/ShareModal";
import { commentsApi } from "../../api/comments.api";
import { openAuthModal } from "../../utils/authModalBus";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useMessageBox } from "../MessageBox";
import { getUserDisplayName, normalizeFeedItem } from "../../utils/feedItem";
import { feedApi } from "../../api/feed.api";
import VideoViewerPanel from "../VideoViewerPanel";

const MAX_COMMENT_CHARS = 1000;

const shellClass =
  "flex box-border h-[min(100svh,100dvh)] max-h-[min(100svh,100dvh)] min-h-[280px] items-center justify-center lg:h-[calc(100dvh-7rem)] lg:max-h-none";

export default function FeedContainer() {
  const { user, isAuthenticated } = useAuth();
  const { show } = useMessageBox();
  const resetKey = user?.id ? `user:${user.id}` : "anon";
  const {
    items,
    loading,
    error,
    loadMore,
    updateFeedVideo,
    removeFeedVideo,
    removingVideoIds,
    refresh,
  } = useFeedItems(resetKey);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsVideoId, setCommentsVideoId] = useState(null);
  const [reportVideo, setReportVideo] = useState(null);
  const [shareVideo, setShareVideo] = useState(null);
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelShown, setPanelShown] = useState(false);
  const closeTimerRef = useRef(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [composerSending, setComposerSending] = useState(false);
  const [composerBottom, setComposerBottom] = useState(0);
  const [incomingComment, setIncomingComment] = useState(null);
  const composerRef = useRef(null);

  const feedListRef = useRef(null);
  const [devMode, setDevMode] = useState(() => localStorage.getItem("dev_mode") === "true");
  const [recommendationsOpen, setRecommendationsOpen] = useState(false);
  const [recomMounted, setRecomMounted] = useState(false);
  const [recomShown, setRecomShown] = useState(false);
  const recomTimerRef = useRef(null);
  const [selectedVideo, setSelectedVideo] = useState(null);

  const [recomItems, setRecomItems] = useState([]);
  const [recomLoading, setRecomLoading] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    if (!isAuthenticated) {
      setRecomItems([]);
      return;
    }
    setRecomLoading(true);
    try {
      const data = await feedApi.getFeeds();
      const raw = Array.isArray(data) ? data : data?.results ?? [];
      setRecomItems(raw.map(normalizeFeedItem));
    } catch (e) {
      console.error(e);
    } finally {
      setRecomLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setRecomItems([]);
  }, [user?.id]);

  const hasPersonalizedRecoms = useMemo(() => {
    if (!isAuthenticated) return false;
    return recomItems.some((item) => {
      const video = item?.video ?? item;
      return !video.isDefaultFeed;
    });
  }, [recomItems, isAuthenticated]);

  const openComments = useCallback((videoId) => {
    if (!videoId) return;
    setRecommendationsOpen(false);
    setCommentsVideoId((prevVideoId) => {
      setCommentsOpen((prevOpen) =>
        prevOpen && prevVideoId === videoId ? false : true
      );
      return videoId;
    });
  }, []);

  const closeComments = useCallback(() => {
    setCommentsOpen(false);
  }, []);

  const closeRecommendations = useCallback(() => {
    setRecommendationsOpen(false);
  }, []);

  useEffect(() => {
    if (recommendationsOpen) {
      if (recomTimerRef.current) {
        window.clearTimeout(recomTimerRef.current);
        recomTimerRef.current = null;
      }
      setCommentsOpen(false);
      setRecomMounted(true);
      setRecomShown(false);
      window.setTimeout(() => setRecomShown(true), 16);
      return;
    }

    setRecomShown(false);
    recomTimerRef.current = window.setTimeout(() => {
      setRecomMounted(false);
      recomTimerRef.current = null;
    }, 300);
  }, [recommendationsOpen]);

  const bumpCommentCount = useCallback(
    (videoId) => {
      if (!videoId) return;
      const inst = items.find((x) => (x?.video ?? x)?.id === videoId);
      const v = inst?.video ?? inst;
      const current = typeof v?.commentCount === "number" ? v.commentCount : 0;
      updateFeedVideo(videoId, { commentCount: current + 1 });
    },
    [items, updateFeedVideo]
  );

  useEffect(() => {
    if (commentsOpen) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      // Mount hidden first, then animate in (ensures transition triggers on mobile).
      setPanelMounted(true);
      setPanelShown(false);
      setDragY(0);
      setDragging(false);
      setComposerOpen(false);
      setComposerText("");
      setIncomingComment(null);
      window.setTimeout(() => setPanelShown(true), 16);
      return;
    }

    // Animate out then unmount.
    setPanelShown(false);
    setDragY(0);
    setDragging(false);
    setComposerOpen(false);
    closeTimerRef.current = window.setTimeout(() => {
      setPanelMounted(false);
      closeTimerRef.current = null;
    }, 300);
  }, [commentsOpen]);

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

  const canSend = useMemo(() => {
    return !!composerText.trim() && !composerSending;
  }, [composerSending, composerText]);

  const sendComposer = useCallback(async () => {
    if (!commentsVideoId) return;
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    const text = composerText.trim();
    if (!text || composerSending) return;
    if (text.length > MAX_COMMENT_CHARS) {
      show({
        status: "warning",
        title: "Bình luận quá dài",
        message: `Tối đa ${MAX_COMMENT_CHARS} ký tự.`,
      });
      return;
    }
    setComposerSending(true);
    try {
      const created = await commentsApi.create({ videoId: commentsVideoId, content: text });
      if (created) {
        setIncomingComment(created);
        bumpCommentCount(created.video ?? commentsVideoId);
        setComposerText("");
        setComposerOpen(false);
      }
    } finally {
      setComposerSending(false);
    }
  }, [bumpCommentCount, commentsVideoId, composerSending, composerText, isAuthenticated]);

  if (loading && items.length === 0) {
    return (
      <div className={`${shellClass} text-gray-500 dark:text-white/80`}>
        <Loader2 className="h-10 w-10 animate-spin" aria-hidden />
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div
        className={`${shellClass} flex-col gap-4 text-center text-gray-800 dark:text-white`}
      >
        <p className="text-sm text-gray-600 dark:text-white/80">Không tải được feed.</p>
        <button
          type="button"
          className="rounded-full bg-gray-200 px-4 py-2 text-sm text-gray-900 hover:bg-gray-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
          onClick={() => window.location.reload()}
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className={`${shellClass} text-sm text-gray-600 dark:text-white/70`}>
        Chưa có video nào.
      </div>
    );
  }

  return (
    <>
      <div
        className={[
          "transition-[margin-right] duration-300 ease-out",
          // Desktop: panel pushes feed. Mobile: no push.
          (panelShown || recomShown) ? "lg:mr-[min(420px,34vw)]" : "",
        ].join(" ")}
      >
        <FeedList
          ref={feedListRef}
          items={items}
          onEndReached={loadMore}
          onReactionUpdate={updateFeedVideo}
          onOpenComments={openComments}
          onReport={setReportVideo}
          onShare={setShareVideo}
          removingVideoIds={removingVideoIds}
          onFeedScroll={closeComments}
          devMode={devMode}
        />
      </div>

      {/* Developer Mode Control Bar */}
      <div className="fixed right-4 top-4 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const next = !devMode;
            setDevMode(next);
            localStorage.setItem("dev_mode", String(next));
          }}
          className={[
            "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold backdrop-blur-md transition-all shadow-md cursor-pointer",
            devMode
              ? "bg-pink-500 text-white hover:bg-pink-600 active:bg-pink-700"
              : "bg-white/95 text-zinc-700 hover:bg-white border border-zinc-200 dark:bg-zinc-900/95 dark:text-zinc-300 dark:border-white/10 dark:hover:bg-zinc-800"
          ].join(" ")}
        >
          <span>DevMode</span>
          <span className={[
            "inline-block w-1.5 h-1.5 rounded-full",
            devMode ? "bg-white animate-pulse" : "bg-zinc-400 dark:bg-zinc-600"
          ].join(" ")} />
        </button>
      </div>

      {/* Mũi tên < đề xuất ở bên phải */}
      {!recomShown && (
        <button
          type="button"
          onClick={() => {
            setRecommendationsOpen(true);
            fetchRecommendations();
          }}
          className="fixed right-0 bottom-12 z-40 flex items-center gap-1 pl-2.5 pr-2 py-3 rounded-l-2xl text-xs font-bold bg-pink-500 hover:bg-pink-600 active:bg-pink-700 text-white border-y border-l border-pink-500/20 shadow-lg shadow-pink-500/20 transition-all hover:pl-3.5 group cursor-pointer"
        >
          <span className="text-[14px] leading-none transition-transform group-hover:-translate-x-0.5 font-bold">&lsaquo;</span>
          <span className="font-sans">Đề xuất</span>
        </button>
      )}

      {/* Drawer Danh sách Gợi ý */}
      {recomMounted && (
        <>
          {/* Backdrop */}
          {recomShown ? (
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden"
              aria-label="Đóng danh sách gợi ý"
              onClick={closeRecommendations}
            />
          ) : null}

          <div
            className={[
              "fixed z-50 bg-white shadow-2xl dark:bg-zinc-950 flex flex-col",
              // Desktop: right panel
              "lg:inset-y-0 lg:right-0 lg:w-[min(420px,34vw)] lg:border-l lg:border-zinc-200/90 lg:dark:border-white/10",
              // Mobile: bottom sheet (75% viewport height), no feed push.
              "max-lg:inset-x-0 max-lg:bottom-0 max-lg:h-[75dvh] max-lg:rounded-t-2xl max-lg:border-t max-lg:border-zinc-200/90 max-lg:dark:border-white/10",
              "transition-transform duration-300 ease-out",
              "will-change-transform",
              recomShown
                ? "max-lg:translate-y-0 lg:translate-x-0"
                : "max-lg:translate-y-full lg:translate-x-full",
            ].join(" ")}
          >
            {/* Header with Title, Refresh, and Close (X) buttons */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-200/90 dark:border-white/10 bg-white dark:bg-zinc-950">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Video đề xuất</h3>
              <div className="flex items-center gap-2">
                {/* Refresh Button */}
                <button
                  type="button"
                  onClick={fetchRecommendations}
                  disabled={recomLoading}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 dark:text-white/70 transition disabled:opacity-50 cursor-pointer"
                  aria-label="Cập nhật đề xuất"
                >
                  <RotateCw size={16} className={recomLoading ? "animate-spin" : ""} />
                </button>
                {/* Close Button (X) */}
                <button
                  type="button"
                  onClick={closeRecommendations}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 dark:text-white/70 transition cursor-pointer"
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </div>
            </div>


            {/* List - Grid format */}
            <div
              className={[
                "flex-1 overflow-y-auto p-4 [scrollbar-width:thin] bg-zinc-50/50 dark:bg-zinc-950 flex flex-col",
                !hasPersonalizedRecoms ? "items-center justify-center text-center" : "",
              ].join(" ")}
            >
              {!hasPersonalizedRecoms ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/10 flex items-center justify-center mb-4 text-pink-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">Chưa có video đề xuất</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed px-6">
                    {isAuthenticated 
                      ? "Hãy tương tác với các video bạn quan tâm nhé!"
                      : "Hãy đăng nhập và tương tác với các video bạn quan tâm nhé!"}
                  </p>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {recomItems.slice(0, 10).map((item, idx) => {
                    const video = item?.video ?? item;
                    const displayName = getUserDisplayName(video);
                    return (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => {
                          setSelectedVideo(video);
                        }}
                        className="group relative flex flex-col w-full text-left rounded-2xl overflow-hidden border border-zinc-150 dark:border-white/5 bg-white hover:bg-zinc-50 dark:bg-zinc-900/60 dark:hover:bg-zinc-900 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer"
                      >
                        {/* Thumbnail Container */}
                        <div className="relative aspect-[3/4] w-full bg-black overflow-hidden">
                          {video.thumbnail ? (
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">
                              Video
                            </div>
                          )}
                        </div>

                        {/* Meta Info */}
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-zinc-950 dark:text-white truncate mb-1">
                              {video.title || "Không có tiêu đề"}
                            </h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                              {displayName.startsWith("@") ? displayName : `@${displayName}`}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <ReportVideoModal
        open={!!reportVideo}
        video={reportVideo}
        onClose={() => setReportVideo(null)}
        onReported={removeFeedVideo}
      />

      <ShareModal
        open={!!shareVideo}
        video={shareVideo}
        onClose={() => setShareVideo(null)}
      />

      <VideoViewerPanel
        open={!!selectedVideo}
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />

      {panelMounted && (
        <>
          {/* Mobile backdrop: tap outside to close */}
          {panelShown ? (
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden"
              aria-label="Đóng bình luận"
              onClick={closeComments}
            />
          ) : null}

          <div
            className={[
              "fixed z-50 bg-white shadow-2xl dark:bg-black",
              // Desktop: right panel.
              "lg:inset-y-0 lg:right-0 lg:w-[min(420px,34vw)] lg:border-l lg:border-zinc-200/90 lg:dark:border-white/10",
              // Mobile: bottom sheet (75% viewport height), no feed push.
              "max-lg:inset-x-0 max-lg:bottom-0 max-lg:h-[75dvh] max-lg:rounded-t-2xl max-lg:border-t max-lg:border-zinc-200/90 max-lg:dark:border-white/10",
              dragging ? "max-lg:transition-none" : "transition-transform duration-300 ease-out",
              "will-change-transform",
              panelShown
                ? "max-lg:translate-y-0 lg:translate-x-0"
                : "max-lg:translate-y-full lg:translate-x-full",
            ].join(" ")}
            style={
              dragging && panelShown
                ? { transform: `translateY(${Math.max(0, dragY)}px)` }
                : undefined
            }
          >
            {/* Mobile drag handle */}
            <div className="lg:hidden">
              <div
                className="flex h-7 items-center justify-center"
                onTouchStart={(e) => {
                  dragStartYRef.current = e.touches?.[0]?.clientY ?? 0;
                  setDragging(true);
                  setDragY(0);
                }}
                onTouchMove={(e) => {
                  if (!dragging) return;
                  const y = e.touches?.[0]?.clientY ?? 0;
                  const dy = Math.max(0, y - dragStartYRef.current);
                  setDragY(dy);
                }}
                onTouchEnd={() => {
                  const shouldClose = dragY > 120;
                  setDragging(false);
                  setDragY(0);
                  if (shouldClose) closeComments();
                }}
              >
                <div className="h-1 w-10 rounded-full bg-zinc-300/80 dark:bg-white/20" />
              </div>
            </div>

            <CommentsPanel
              open
              onClose={closeComments}
              videoId={commentsVideoId}
              incomingComment={incomingComment}
              onRequestMobileComposer={() => {
                if (isDesktop) return;
                setComposerOpen(true);
              }}
              onCommentCreated={(created) => {
                bumpCommentCount(created?.video ?? commentsVideoId);
              }}
            />
          </div>

          {/* Mobile composer (TikTok-like) */}
          {composerOpen && !isDesktop ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-[70] bg-black/55"
                aria-label="Đóng ô nhập bình luận"
                onClick={() => setComposerOpen(false)}
              />
              <div
                className="fixed left-0 right-0 z-[80] px-3"
                style={{ bottom: `${composerBottom}px` }}
              >
                <div className="rounded-2xl border border-white/10 bg-black/75 p-3 backdrop-blur-md">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={composerRef}
                      value={composerText}
                      onChange={(e) => setComposerText(e.target.value.slice(0, MAX_COMMENT_CHARS))}
                      rows={1}
                      placeholder="Viết bình luận..."
                      maxLength={MAX_COMMENT_CHARS}
                      className="min-h-[44px] flex-1 resize-none overflow-hidden rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-500/20"
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        if (e.shiftKey) return;
                        e.preventDefault();
                        sendComposer();
                      }}
                    />
                    <button
                      type="button"
                      disabled={!canSend}
                      onClick={sendComposer}
                      className={[
                        "h-[44px] shrink-0 rounded-xl px-4 text-sm font-semibold text-white transition",
                        canSend
                          ? "bg-pink-500 hover:bg-pink-600 active:bg-pink-700"
                          : "cursor-not-allowed bg-white/15",
                      ].join(" ")}
                    >
                      {composerSending ? "Đang gửi..." : "Gửi"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </>
      )}
    </>
  );
}
