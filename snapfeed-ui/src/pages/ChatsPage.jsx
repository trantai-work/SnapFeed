import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Loader2, MessageSquareText, Video, Plus, UserPlus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { conversationsApi } from "../api";
import { useAuth } from "../context/AuthContext";
import { useRealtimeSocket } from "../context/RealtimeSocketContext";
import { useChatUnread } from "../context/ChatUnreadContext";
import { useChatUI } from "../context/ChatUIContext";
import { useVideoCall } from "../context/VideoCallContext";
import ConversationListItem from "../components/chats/ConversationListItem";
import MessageThread from "../components/chats/MessageThread";
import { buildConversationName } from "../utils/chat";
import ConversationAvatar from "../components/chats/ConversationAvatar";
import CreateGroupModal from "../components/chats/CreateGroupModal";
import AddMembersModal from "../components/chats/AddMembersModal";

export default function ChatsPage() {
  const { user, isAuthenticated } = useAuth();
  const meId = user?.id ?? null;
  const location = useLocation();
  const navigate = useNavigate();
  const { subscribe } = useRealtimeSocket();
  const { setConversationUnread } = useChatUnread();
  const { setActiveConversationId } = useChatUI();
  const { startCall } = useVideoCall();
  const refreshInFlightRef = useRef(false);
  const lastReadPingRef = useRef(new Map()); // convId -> last time we pinged /read (ms)

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const toIdNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const getConvUnread = (c) =>
    Number(c?.unreadCount ?? c?.unread_count ?? 0) || 0;

  const moveToTop = useCallback((arr, idx) => {
    if (idx <= 0) return arr;
    const copy = [...arr];
    const [it] = copy.splice(idx, 1);
    copy.unshift(it);
    return copy;
  }, []);

  const refreshConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      const data = await conversationsApi.list();
      const results = Array.isArray(data?.results) ? data.results : [];
      setItems(results);
    } catch {
      // ignore
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [isAuthenticated]);

  const bumpConversation = useCallback(
    (convId, patch = {}) => {
      const idNum = toIdNum(convId);
      if (!idNum) return;

      setItems((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        const idx = arr.findIndex((c) => toIdNum(c?.id) === idNum);
        if (idx < 0) {
          return [{ id: idNum, ...patch }, ...arr];
        }
        const next = arr.map((c, i) => (i === idx ? { ...c, ...patch } : c));
        return moveToTop(next, idx);
      });
    },
    [moveToTop]
  );

  const maybeMarkRead = useCallback(
    async (conv) => {
      const convId = toIdNum(conv?.id);
      if (!isAuthenticated || !convId) return;

      const unread = getConvUnread(conv);
      const now = Date.now();
      const last = Number(lastReadPingRef.current.get(convId) || 0);
      if (now - last < 800) return; // prevent spamming on rapid clicks/mousedown
      lastReadPingRef.current.set(convId, now);

      // Optimistic UI update: clear unread badge immediately.
      // IMPORTANT: don't rely on `conv.unreadCount` here; the list item can be stale
      // while the sidebar badge already updated from realtime events.
      setItems((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        return arr.map((c) => {
          if (!c || toIdNum(c?.id) !== convId) return c;
          return { ...c, unreadCount: 0, unread_count: 0 };
        });
      });
      setConversationUnread(convId, 0);

      try {
        await conversationsApi.markRead(convId);
      } catch {
        // ignore
      }
    },
    [isAuthenticated, setConversationUnread]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    const open = location?.state?.openConversation ?? null;
    if (!open || !open?.id) return;
    setSelectedConversation(open);
    // On mobile, the thread is an overlay; open it when deep-linking from a toast.
    setMobileThreadOpen(true);
    // Clear state so it won't re-trigger on back/refresh.
    navigate(location.pathname, { replace: true, state: {} });
  }, [isAuthenticated, location?.pathname, location?.state, navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      setError(null);
      setLoading(false);
      setSelectedConversation(null);
      setMobileThreadOpen(false);
      return;
    }

    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await conversationsApi.list();
        if (!alive) return;
        const results = Array.isArray(data?.results) ? data.results : [];
        setItems(results);
        setSelectedConversation((prev) => prev ?? (results[0] ?? null));
      } catch (e) {
        if (!alive) return;
        setError(e);
        setItems([]);
        setSelectedConversation(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isAuthenticated]);

  const list = useMemo(() => items || [], [items]);
  const selectedId = selectedConversation?.id ?? null;
  const resolvedSelectedConversation = useMemo(() => {
    if (!selectedId) return null;
    return list.find((c) => c?.id === selectedId) ?? selectedConversation;
  }, [list, selectedConversation, selectedId]);

  // Track which conversation is currently open in the thread panel (for toast suppression).
  useEffect(() => {
    if (!isAuthenticated) {
      setActiveConversationId(null);
      return;
    }

    const isDesktop =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(min-width: 768px)").matches;

    // On desktop, the thread is visible when a conversation is selected.
    // On mobile, it's visible only when the overlay is open.
    const next = isDesktop
      ? resolvedSelectedConversation?.id ?? null
      : mobileThreadOpen
        ? resolvedSelectedConversation?.id ?? null
        : null;

    setActiveConversationId(next);
  }, [isAuthenticated, mobileThreadOpen, resolvedSelectedConversation?.id, setActiveConversationId]);

  useEffect(() => {
    return () => setActiveConversationId(null);
  }, [setActiveConversationId]);

  // Inbox events (shared websocket): keeps list ordering/unread state in sync.
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubMsg = subscribe("message.created", (payload) => {
      const msg = payload?.message ?? null;
      const convId = payload?.conversationId ?? msg?.conversation ?? msg?.conversationId ?? null;
      const convIdNum = toIdNum(convId);
      if (!convIdNum) return;

      // Update list if conversation is already present; otherwise refresh from server
      // (needed to have participants/title for display).
      setItems((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        const idx = arr.findIndex((c) => toIdNum(c?.id) === convIdNum);
        if (idx < 0) return arr;

        const unreadCount = Number(payload?.unreadCount ?? 0) || 0;
        const createdAt = msg?.createdAt ?? msg?.created_at ?? null;
        const patched = {
          lastMessage: msg,
          lastMessageAt: createdAt || arr[idx]?.lastMessageAt || null,
          unreadCount,
        };
        const next = arr.map((c, i) => (i === idx ? { ...c, ...patched } : c));
        return moveToTop(next, idx);
      });

      // If not found, refetch list (best-effort).
      void (async () => {
        const cur = itemsRef.current;
        const has = (Array.isArray(cur) ? cur : []).some((c) => toIdNum(c?.id) === convIdNum);
        if (!has) await refreshConversations();
      })();
    });

    const unsubConv = subscribe("conversation.updated", (payload) => {
      const conv = payload?.conversation ?? null;
      const convId = conv?.id ?? null;
      const convIdNum = toIdNum(convId);
      if (!convIdNum) return;

      const patched = {
        id: convIdNum,
        type: conv?.type ?? undefined,
        title: conv?.title ?? undefined,
        directKey: conv?.directKey ?? conv?.direct_key ?? undefined,
        participants: Array.isArray(conv?.participants) ? conv.participants : undefined,
        lastMessageAt: conv?.lastMessageAt ?? conv?.last_message_at ?? null,
        lastMessage: conv?.lastMessage ?? conv?.last_message ?? null,
        unreadCount: Number(conv?.unreadCount ?? conv?.unread_count ?? 0) || 0,
      };

      bumpConversation(convIdNum, patched);
    });

    return () => {
      unsubMsg?.();
      unsubConv?.();
    };
  }, [bumpConversation, isAuthenticated, moveToTop, refreshConversations]);

  const handleGroupCreated = (newGroup) => {
    setItems((prev) => [newGroup, ...prev]);
    setSelectedConversation(newGroup);
    setMobileThreadOpen(true);
  };

  const existingParticipantIds = useMemo(() => {
    return (resolvedSelectedConversation?.participants || [])
      .map((p) => Number(p.id || p.user?.id))
      .filter(Boolean);
  }, [resolvedSelectedConversation]);

  const handleMembersAdded = (updatedConv) => {
    setItems((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      const idx = arr.findIndex((c) => toIdNum(c?.id) === toIdNum(updatedConv.id));
      if (idx >= 0) {
        const next = [...arr];
        next[idx] = {
          ...next[idx],
          ...updatedConv,
        };
        return next;
      }
      return prev;
    });
    setSelectedConversation(updatedConv);
  };

  return (
    <div className="flex h-[100dvh] min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-black md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-gray-200 bg-white dark:border-white/10 dark:bg-black md:h-full md:w-[min(22rem,92vw)] md:border-b-0 md:border-r sm:md:w-[min(24rem,92vw)]">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-100 dark:border-white/5 md:border-b-0 md:px-4 md:py-4">
          <div className="text-base md:text-lg font-bold text-zinc-950 dark:text-white">Tin nhắn</div>
          <button 
            type="button"
            onClick={() => setCreateGroupOpen(true)}
            className="flex items-center gap-1 rounded-xl bg-pink-500 hover:bg-pink-600 dark:bg-pink-600 dark:hover:bg-pink-700 px-3 py-1.5 text-xs font-semibold text-white transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Tạo nhóm
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex h-full items-center justify-center py-10 text-gray-500 dark:text-white/60">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              <span className="ml-2 text-sm">Đang tải…</span>
            </div>
          ) : error ? (
            <div className="px-3 py-6 text-sm text-red-600 dark:text-red-400">
              Không tải được danh sách tin nhắn.
            </div>
          ) : list.length === 0 ? (
            <div className="px-3 py-6 text-sm text-gray-600 dark:text-white/60">
              Chưa có cuộc trò chuyện.
            </div>
          ) : (
            <div className="space-y-1">
              {list.map((conv, idx) => (
                <ConversationListItem
                  key={conv?.id ?? idx}
                  active={conv?.id === selectedId}
                  conv={conv}
                  meId={meId}
                  onClick={() => {
                    setSelectedConversation(conv ?? null);
                    setMobileThreadOpen(true);
                    void maybeMarkRead(conv);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Desktop thread pane */}
      <section className="relative hidden min-h-0 flex-1 bg-white dark:bg-black md:flex">
        {!resolvedSelectedConversation ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white/80">
              <MessageSquareText className="h-8 w-8" strokeWidth={1.8} />
            </div>
            <div className="text-sm font-semibold">Chọn một cuộc trò chuyện</div>
            <div className="max-w-md text-sm text-gray-600 dark:text-white/60">
              Tin nhắn sẽ hiển thị ở đây. Bạn có thể chọn cuộc trò chuyện ở cột bên trái.
            </div>
          </div>
        ) : (
          <div
            className="flex h-full min-h-0 flex-1"
            onMouseDown={() => {
              void maybeMarkRead(resolvedSelectedConversation);
            }}
          >
            <MessageThread
              conversation={resolvedSelectedConversation}
              meId={meId}
              onAddMembersClick={() => setAddMembersOpen(true)}
              onLatestIncomingMessageId={() => {}}
              onMessageSent={(msg) => {
                const createdAt = msg?.createdAt ?? msg?.created_at ?? null;
                const convId = resolvedSelectedConversation?.id ?? null;
                if (!convId) return;

                // Sender side: keep unread at 0, update last message, and move to top.
                setItems((prev) => {
                  const arr = Array.isArray(prev) ? prev : [];
                  const idx = arr.findIndex((c) => toIdNum(c?.id) === toIdNum(convId));
                  if (idx >= 0) {
                    const next = arr.map((c, i) => {
                      if (i !== idx || !c) return c;
                      return {
                        ...c,
                        lastMessage: msg,
                        lastMessageAt: createdAt || c.lastMessageAt || null,
                        unreadCount: 0,
                        unread_count: 0,
                      };
                    });
                    return moveToTop(next, idx);
                  }

                  // If this conversation wasn't in inbox list (e.g. empty convo), add it after first message.
                  const seeded = {
                    ...(resolvedSelectedConversation || {}),
                    lastMessage: msg,
                    lastMessageAt:
                      createdAt ||
                      resolvedSelectedConversation?.lastMessageAt ||
                      resolvedSelectedConversation?.last_message_at ||
                      null,
                    unreadCount: 0,
                    unread_count: 0,
                  };
                  return [seeded, ...arr];
                });

                // Sender side: ensure global unread total stays consistent.
                setConversationUnread(convId, 0);
              }}
            />
          </div>
        )}
      </section>

      {/* Mobile thread overlay: starts with inbox list, slides up on selection */}
      <div
        className={[
          // Higher than the mobile sidebar button so it won't show over the thread panel.
          "fixed inset-0 z-[200] flex flex-col bg-white dark:bg-black md:hidden",
          "transition-transform duration-300 ease-out will-change-transform",
          mobileThreadOpen && resolvedSelectedConversation
            ? "translate-y-0"
            : "translate-y-full",
        ].join(" ")}
        aria-hidden={!(mobileThreadOpen && resolvedSelectedConversation)}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white/80 px-3 py-3 backdrop-blur-md dark:border-white/10 dark:bg-black/40">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-2xl hover:bg-black/5 active:bg-black/10 dark:hover:bg-white/10 dark:active:bg-white/15"
            aria-label="Quay lại danh sách"
            onClick={() => setMobileThreadOpen(false)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <ConversationAvatar conv={resolvedSelectedConversation} meId={meId} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {resolvedSelectedConversation
                ? buildConversationName(resolvedSelectedConversation, meId)
                : "Tin nhắn"}
            </div>
            <div className="truncate text-xs text-gray-500 dark:text-white/50">
              {resolvedSelectedConversation?.type === "group"
                ? "Nhóm"
                : resolvedSelectedConversation?.type === "self"
                  ? "Ghi chú"
                  : "Trò chuyện"}
            </div>
          </div>

          {/* Video call button (mobile) */}
          {resolvedSelectedConversation?.type === "direct" && (() => {
            const parts = resolvedSelectedConversation?.participants || [];
            const recipient = parts.find(p => (p?.id ?? p?.user?.id) !== meId) || null;
            if (!recipient) return null;
            return (
              <button
                onClick={() => startCall(recipient, resolvedSelectedConversation.id)}
                className="mr-1 flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-black/5 hover:text-gray-900 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white transition-all cursor-pointer active:scale-90"
                title="Cuộc gọi video"
              >
                <Video className="h-5 w-5" />
              </button>
            );
          })()}

          {/* Add member button (mobile) */}
          {resolvedSelectedConversation?.type === "group" && (
            <button
              onClick={() => setAddMembersOpen(true)}
              className="mr-1 flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 hover:bg-black/5 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100 transition-all cursor-pointer active:scale-90"
              title="Thêm thành viên"
            >
              <UserPlus className="h-5 w-5" />
            </button>
          )}
        </div>

        <div
          className="min-h-0 flex-1"
          onMouseDown={() => {
            if (resolvedSelectedConversation) void maybeMarkRead(resolvedSelectedConversation);
          }}
        >
          {resolvedSelectedConversation ? (
            <MessageThread
              conversation={resolvedSelectedConversation}
              meId={meId}
              showHeader={false}
              onAddMembersClick={() => setAddMembersOpen(true)}
              onLatestIncomingMessageId={() => {}}
              onMessageSent={(msg) => {
                const createdAt = msg?.createdAt ?? msg?.created_at ?? null;
                const convId = resolvedSelectedConversation?.id ?? null;
                if (!convId) return;

                setItems((prev) => {
                  const arr = Array.isArray(prev) ? prev : [];
                  const idx = arr.findIndex((c) => toIdNum(c?.id) === toIdNum(convId));
                  if (idx >= 0) {
                    const next = arr.map((c, i) => {
                      if (i !== idx || !c) return c;
                      return {
                        ...c,
                        lastMessage: msg,
                        lastMessageAt: createdAt || c.lastMessageAt || null,
                        unreadCount: 0,
                        unread_count: 0,
                      };
                    });
                    return moveToTop(next, idx);
                  }

                  const seeded = {
                    ...(resolvedSelectedConversation || {}),
                    lastMessage: msg,
                    lastMessageAt:
                      createdAt ||
                      resolvedSelectedConversation?.lastMessageAt ||
                      resolvedSelectedConversation?.last_message_at ||
                      null,
                    unreadCount: 0,
                    unread_count: 0,
                  };
                  return [seeded, ...arr];
                });

                setConversationUnread(convId, 0);
              }}
            />
          ) : null}
        </div>
      </div>

      <CreateGroupModal
        open={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        meId={meId}
        onGroupCreated={handleGroupCreated}
      />

      <AddMembersModal
        open={addMembersOpen}
        onClose={() => setAddMembersOpen(false)}
        meId={meId}
        conversationId={resolvedSelectedConversation?.id}
        existingParticipantIds={existingParticipantIds}
        onMembersAdded={handleMembersAdded}
      />
    </div>
  );
}

