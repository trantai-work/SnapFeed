import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Loader2, SendHorizontal, Paperclip, X, UserPlus } from "lucide-react";
import { messagesApi } from "../../api";
import MessageBubble from "./MessageBubble";
import ConversationAvatar from "./ConversationAvatar";
import { buildConversationName } from "../../utils/chat";
import { useRealtimeSocket } from "../../context/RealtimeSocketContext";
import { useMessageBox } from "../MessageBox";
import { useVideoCall } from "../../context/VideoCallContext";
import { Video } from "lucide-react";
import GroupMembersModal from "./GroupMembersModal";

export default function MessageThread({
  conversation,
  meId,
  onMessageSent,
  onLatestIncomingMessageId,
  showHeader = true,
  onAddMembersClick,
}) {
  const { startCall } = useVideoCall();
  const convId = conversation?.id ?? null;
  const { subscribe } = useRealtimeSocket();
  const { show } = useMessageBox();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const loadMoreLockRef = useRef(false);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastConvIdRef = useRef(null);
  const isPrependingRef = useRef(false);

  const toIdNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const recipient = useMemo(() => {
    if (conversation?.type !== "direct") return null;
    const other = conversation.participants?.find((p) => toIdNum(p.id) !== toIdNum(meId)) || 
                  conversation.participants?.find((p) => toIdNum(p.user?.id) !== toIdNum(meId));
    return other?.user || other;
  }, [conversation, meId]);

  const parseMsgTime = (m) => {
    const raw = m?.createdAt ?? m?.created_at ?? null;
    if (!raw) return null;
    const d = raw instanceof Date ? raw : new Date(raw);
    const ts = d.getTime();
    return Number.isFinite(ts) ? d : null;
  };

  const pad2 = (n) => String(Math.max(0, Number(n) || 0)).padStart(2, "0");

  const formatTimeGroupLabelVi = (d) => {
    if (!(d instanceof Date)) return "";
    const ts = d.getTime();
    if (!Number.isFinite(ts)) return "";

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfThatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayDiff = Math.round((startOfToday - startOfThatDay) / 86400000);

    const hhmm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    if (dayDiff === 0) return hhmm;
    if (dayDiff === 1) return `${hhmm} hôm qua`;
    return `${hhmm} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  const prependOlder = async () => {
    if (!convId) return;
    if (!nextCursor) return;
    if (loadingMore || loadMoreLockRef.current) return;

    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;

    loadMoreLockRef.current = true;
    setLoadingMore(true);
    try {
      const data = await messagesApi.list({
        conversationId: convId,
        cursor: nextCursor,
      });
      const results = Array.isArray(data?.results) ? data.results : [];
      const olderAsc = [...results].reverse(); // older -> newer
      isPrependingRef.current = true;
      setItems((prev) => [...olderAsc, ...(prev || [])]);
      setNextCursor(data?.nextCursor ?? null);

      // keep visual position after prepending
      requestAnimationFrame(() => {
        const nextHeight = el?.scrollHeight ?? 0;
        if (el) el.scrollTop = nextHeight - prevHeight + prevTop;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
      loadMoreLockRef.current = false;
    }
  };

  const send = async () => {
    const text = draft.trim();
    if ((!text && !attachment) || !convId || sending) return;
    setSending(true);
    try {
      let attachmentKey = undefined;
      let attachmentName = undefined;
      let attachmentSize = undefined;
      let attachmentType = undefined;

      if (attachment) {
        // 1. Get presigned URL
        const presignedRes = await messagesApi.getUploadPresignedUrl({
          conversationId: convId,
          fileName: attachment.name,
          contentType: attachment.type || "application/octet-stream",
        });

        // 2. Upload to S3
        const formData = new FormData();
        for (const [key, value] of Object.entries(presignedRes.fields || {})) {
          formData.append(key, value);
        }
        formData.append("file", attachment);

        const uploadRes = await fetch(presignedRes.url, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Upload failed");
        }

        attachmentKey = presignedRes?.fields?.key || presignedRes?.s3Key || presignedRes?.s3_key;
        attachmentName = attachment.name;
        attachmentSize = attachment.size;
        attachmentType = attachment.type?.startsWith("image/") ? "image" : "file";
      }

      const created = await messagesApi.create({
        conversationId: convId,
        content: text,
        attachmentKey,
        attachmentName,
        attachmentSize,
        attachmentType,
      });
      const createdId = toIdNum(created?.id);
      setItems((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        if (createdId != null && arr.some((m) => toIdNum(m?.id) === createdId)) {
          return arr;
        }
        return [...arr, created];
      });
      setDraft("");
      setAttachment(null);
      onMessageSent?.(created);
    } catch (e) {
      console.error(e);
      setError(e);
    } finally {
      setSending(false);
    }
  };

  // Avoid showing stale messages when switching conversations:
  // flip to loading state synchronously before paint.
  useLayoutEffect(() => {
    if (convId === lastConvIdRef.current) return;
    lastConvIdRef.current = convId;

    if (!convId) return;
    setLoading(true);
    setError(null);
    setItems([]);
    setNextCursor(null);
  }, [convId]);

  useEffect(() => {
    if (!convId) {
      setItems([]);
      setError(null);
      setLoading(false);
      setNextCursor(null);
      return;
    }

    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await messagesApi.list({ conversationId: convId });
        if (!alive) return;
        const results = Array.isArray(data?.results) ? data.results : [];
        // API đang order -id, UI muốn hiển thị từ cũ -> mới
        setItems([...results].reverse());
        setNextCursor(data?.nextCursor ?? null);
      } catch (e) {
        if (!alive) return;
        setError(e);
        setItems([]);
        setNextCursor(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [convId]);

  useEffect(() => {
    if (!convId) return;

    // Append realtime messages for the currently open conversation.
    const unsub = subscribe("message.created", (payload) => {
      const msg = payload?.message ?? null;
      if (!msg) return;
      const incomingConvId =
        payload?.conversationId ?? msg?.conversation ?? msg?.conversationId ?? null;
      if (toIdNum(incomingConvId) !== toIdNum(convId)) return;

      const msgId = toIdNum(msg?.id);
      setItems((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        if (msgId != null && arr.some((m) => toIdNum(m?.id) === msgId)) return arr;
        return [...arr, msg];
      });
    });

    return () => unsub?.();
  }, [convId, subscribe]);

  const list = useMemo(() => items || [], [items]);

  useEffect(() => {
    if (!convId) return;
    if (!meId) return;
    if (typeof onLatestIncomingMessageId !== "function") return;

    let maxId = null;
    for (const m of list) {
      const senderId = m?.sender?.id ?? null;
      if (!senderId || Number(senderId) === Number(meId)) continue;
      const idNum = toIdNum(m?.id);
      if (idNum == null) continue;
      if (maxId == null || idNum > maxId) maxId = idNum;
    }

    onLatestIncomingMessageId(convId, maxId);
  }, [convId, list, meId, onLatestIncomingMessageId]);
  const renderedList = useMemo(() => {
    const arr = Array.isArray(list) ? list : [];
    const out = [];

    const GAP_MS = 20 * 60 * 1000; // group by 20-minute gaps
    let prevTime = null;

    for (const m of arr) {
      const t = parseMsgTime(m);
      if (!t) {
        out.push({ type: "message", msg: m });
        continue;
      }

      const shouldSeparate = (() => {
        if (!prevTime) return true;
        const prevDay = new Date(
          prevTime.getFullYear(),
          prevTime.getMonth(),
          prevTime.getDate()
        ).getTime();
        const curDay = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
        if (curDay !== prevDay) return true;
        return t.getTime() - prevTime.getTime() >= GAP_MS;
      })();

      if (shouldSeparate) {
        out.push({
          type: "separator",
          key: `sep-${t.toISOString()}`,
          label: formatTimeGroupLabelVi(t),
        });
      }

      out.push({ type: "message", msg: m });
      prevTime = t;
    }

    return out;
  }, [list]);

  useEffect(() => {
    if (isPrependingRef.current) {
      isPrependingRef.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView?.({ behavior: "instant", block: "end" });
  }, [convId, list.length]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const maxPx = 112; // ~7 lines at current font-size/padding
    const next = Math.min(maxPx, el.scrollHeight);
    el.style.height = `${next}px`;
  }, [draft]);

  if (!convId) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-600 dark:text-white/60">
        Chọn một cuộc trò chuyện để xem tin nhắn.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full w-full flex-1 items-center justify-center py-10 text-gray-500 dark:text-white/60">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        <span className="ml-2 text-sm">Đang tải tin nhắn…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-6 py-6 text-sm text-red-600 dark:text-red-400">
        Không tải được tin nhắn.
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-1 flex-col bg-white dark:bg-black">
      {showHeader ? (
        <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white/70 px-4 py-4 backdrop-blur-md dark:border-white/10 dark:bg-black/30">
          <div
            className={`flex items-center gap-3 min-w-0 flex-1 ${conversation?.type === "group" ? "cursor-pointer hover:opacity-85 active:scale-[0.99] transition-all" : ""}`}
            onClick={() => {
              if (conversation?.type === "group") {
                setMembersModalOpen(true);
              }
            }}
          >
            <ConversationAvatar conv={conversation} meId={meId} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {buildConversationName(conversation, meId)}
              </div>
              <div className="truncate text-xs text-gray-500 dark:text-white/50">
                {conversation?.type === "group"
                  ? "Nhóm • Nhấp để xem thành viên"
                  : conversation?.type === "self"
                    ? "Ghi chú"
                    : "Trò chuyện"}
              </div>
            </div>
          </div>

          {conversation?.type === "direct" && recipient && (
            <button
              onClick={() => {
                console.log("[MessageThread] Calling startCall with convId:", convId);
                startCall(recipient, convId);
              }}
              className="mr-2 flex h-12 w-12 items-center justify-center rounded-full text-gray-500 hover:bg-black/5 hover:text-gray-900 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white transition-all cursor-pointer active:scale-90"
              title="Cuộc gọi video"
            >
              <Video className="h-6 w-6" />
            </button>
          )}

          {conversation?.type === "group" && (
            <button
              onClick={() => {
                console.log("[MessageThread] Starting group call with convId:", convId);
                startCall(null, convId, true, conversation);
              }}
              className="mr-2 flex h-12 w-12 items-center justify-center rounded-full text-gray-500 hover:bg-black/5 hover:text-gray-900 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white transition-all cursor-pointer active:scale-90"
              title="Cuộc gọi nhóm"
            >
              <Video className="h-6 w-6" />
            </button>
          )}

          {conversation?.type === "group" && typeof onAddMembersClick === "function" && (
            <button
              onClick={onAddMembersClick}
              className="mr-2 flex h-12 w-12 items-center justify-center rounded-full text-zinc-500 hover:bg-black/5 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100 transition-all cursor-pointer active:scale-90"
              title="Thêm thành viên"
            >
              <UserPlus className="h-6 w-6" />
            </button>
          )}
        </header>
      ) : null}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={() => {
          const el = scrollRef.current;
          if (!el) return;
          if (el.scrollTop > 140) return;
          void prependOlder();
        }}
      >
        <div className="space-y-3">
          {loadingMore ? (
            <div className="flex justify-center py-2 text-gray-500 dark:text-white/60">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span className="ml-2 text-xs">Đang tải tin nhắn cũ…</span>
            </div>
          ) : null}
          {list.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-600 dark:text-white/60">
              Chưa có tin nhắn.
            </div>
          ) : (
            renderedList.map((row, idx) => {
              if (row?.type === "separator") {
                return (
                  <div
                    key={row.key ?? `sep-${idx}`}
                    className="flex justify-center py-1"
                  >
                    <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-white/10 dark:text-white/70">
                      {row.label}
                    </div>
                  </div>
                );
              }

              const msg = row?.msg ?? null;
              return (
                <MessageBubble
                  key={msg?.id ?? `msg-${idx}`}
                  msg={msg}
                  meId={meId}
                  conversation={conversation}
                />
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-200 bg-white/70 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-black/30">
        {attachment && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 dark:bg-white/10 max-w-sm">
            <Paperclip className="h-4 w-4 shrink-0 text-gray-500 dark:text-white/60" />
            <div className="flex-1 truncate text-sm text-gray-700 dark:text-white/80">
              {attachment.name}
            </div>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="shrink-0 rounded-full p-1 text-gray-500 hover:bg-black/10 hover:text-gray-900 dark:text-white/60 dark:hover:bg-white/20 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-2xl text-gray-500 transition hover:bg-black/5 hover:text-gray-900 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            aria-label="Đính kèm file"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const MAX_SIZE = 50 * 1024 * 1024; // 50MB
                if (file.size > MAX_SIZE) {
                  show({
                    status: "error",
                    title: "File quá lớn",
                    message: `Kích thước tối đa là 50MB. File của bạn: ${(file.size / 1024 / 1024).toFixed(1)}MB`,
                    duration: 5000,
                  });
                  e.target.value = "";
                  return;
                }
                setAttachment(file);
              }
              e.target.value = "";
            }}
          />
          <div className="flex-1 rounded-2xl bg-white/80 ring-1 ring-black/5 backdrop-blur-md dark:bg-white/10 dark:ring-white/10">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                if (e.shiftKey) return;
                e.preventDefault();
                void send();
              }}
              rows={1}
              placeholder="Gõ tin nhắn…"
              className="w-full resize-none bg-transparent px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-500 dark:text-white dark:placeholder:text-white/50"
            />
          </div>
          <button
            type="button"
            className="grid h-11 w-11 cursor-pointer place-items-center rounded-2xl bg-sky-500 text-white shadow-sm transition hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Gửi"
            disabled={(!draft.trim() && !attachment) || sending}
            onClick={() => void send()}
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
          </button>
        </div>
      </div>
      
      <GroupMembersModal
        open={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
        conversation={conversation}
        meId={meId}
      />
    </div>
  );
}

