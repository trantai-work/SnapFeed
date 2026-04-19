import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessageSquareText } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { conversationsApi } from "../api";
import { useAuth } from "../context/AuthContext";
import { useChatsSocket } from "../context/ChatsSocketContext";
import ConversationListItem from "../components/chats/ConversationListItem";
import MessageThread from "../components/chats/MessageThread";

export default function ChatsPage() {
  const { user, isAuthenticated } = useAuth();
  const meId = user?.id ?? null;
  const location = useLocation();
  const navigate = useNavigate();
  const { subscribe } = useChatsSocket();
  const refreshInFlightRef = useRef(false);
  const lastReadPingRef = useRef(new Map()); // convId -> last time we pinged /read (ms)

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
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

      if (unread > 0) {
        // Optimistic UI update: clear unread badge immediately.
        setItems((prev) => {
          const arr = Array.isArray(prev) ? prev : [];
          return arr.map((c) => {
            if (!c || toIdNum(c?.id) !== convId) return c;
            return { ...c, unreadCount: 0, unread_count: 0 };
          });
        });
      }

      try {
        await conversationsApi.markRead(convId);
      } catch {
        // ignore
      }
    },
    [isAuthenticated]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    const open = location?.state?.openConversation ?? null;
    if (!open || !open?.id) return;
    setSelectedConversation(open);
    // Clear state so it won't re-trigger on back/refresh.
    navigate(location.pathname, { replace: true, state: {} });
  }, [isAuthenticated, location?.pathname, location?.state, navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      setError(null);
      setLoading(false);
      setSelectedConversation(null);
      try {
        wsRef.current?.close?.();
      } catch {
        // ignore
      } finally {
        wsRef.current = null;
      }
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

  // Inbox events (shared websocket): keeps list ordering/unread state in sync.
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubscribe = subscribe((data) => {
      if (!data || typeof data !== "object") return;

      if (data.type === "message.created") {
        const payload = data?.payload ?? null;
        const msg = payload?.message ?? null;
        const convId =
          payload?.conversationId ?? msg?.conversation ?? msg?.conversationId ?? null;
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
          const has = (Array.isArray(cur) ? cur : []).some(
            (c) => toIdNum(c?.id) === convIdNum
          );
          if (!has) await refreshConversations();
        })();
      }

      if (data.type === "conversation.updated") {
        const conv = data?.payload?.conversation ?? null;
        const convId = conv?.id ?? null;
        const convIdNum = toIdNum(convId);
        if (!convIdNum) return;

        // Payload is expected to be sufficient to render inbox item.
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
      }
    });

    return unsubscribe;
  }, [bumpConversation, isAuthenticated, moveToTop, refreshConversations]);

  return (
    <div className="flex h-[100dvh] min-h-0 min-w-0 flex-1 overflow-hidden bg-white dark:bg-black">
      <aside className="flex h-full w-[min(22rem,92vw)] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-white/10 dark:bg-black sm:w-[min(24rem,92vw)]">
        <div className="px-4 py-4">
          <div className="text-lg font-bold">Tin nhắn</div>
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
                    void maybeMarkRead(conv);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      <section className="relative hidden h-full min-h-0 flex-1 bg-white dark:bg-black md:flex">
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
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}

