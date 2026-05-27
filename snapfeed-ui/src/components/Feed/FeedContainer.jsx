import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
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

  const openComments = useCallback((videoId) => {
    if (!videoId) return;
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

  if (loading) {
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
          panelShown ? "lg:mr-[min(420px,34vw)]" : "",
        ].join(" ")}
      >
        <FeedList
          items={items}
          onEndReached={loadMore}
          onReactionUpdate={updateFeedVideo}
          onOpenComments={openComments}
          onReport={setReportVideo}
          onShare={setShareVideo}
          removingVideoIds={removingVideoIds}
          onFeedScroll={closeComments}
        />
      </div>

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
