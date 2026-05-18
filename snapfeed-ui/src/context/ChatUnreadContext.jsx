import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { conversationsApi } from "../api/conversations.api";
import { useAuth } from "./AuthContext";
import { useRealtimeSocket } from "./RealtimeSocketContext";

const ChatUnreadContext = createContext(null);

const toIdNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// NOTE: `unreadCount/unread_count` coming from backend is "unread messages count in this conversation".
// For the sidebar badge we want "number of conversations with unread > 0", so we store a 0/1 flag per conversation.
const getUnreadMessagesCount = (conv) =>
  Number(conv?.unreadCount ?? conv?.unread_count ?? 0) || 0;

export function ChatUnreadProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { subscribe } = useRealtimeSocket();

  const [unreadByConvId, setUnreadByConvId] = useState(() => new Map());
  const seedInFlightRef = useRef(false);

  const setConversationUnread = useCallback((conversationId, unreadCount) => {
    const id = toIdNum(conversationId);
    if (id == null) return;
    const nextUnread = Math.max(0, Number(unreadCount) || 0);
    const nextFlag = nextUnread > 0 ? 1 : 0;
    setUnreadByConvId((prev) => {
      const m = prev instanceof Map ? prev : new Map();
      const cur = Number(m.get(id) || 0) ? 1 : 0;
      if (cur === nextFlag) return m;
      const copy = new Map(m);
      copy.set(id, nextFlag);
      return copy;
    });
  }, []);

  const seedFromServer = useCallback(async () => {
    if (!isAuthenticated) return;
    if (seedInFlightRef.current) return;
    if (window.location.pathname.startsWith("/moderator")) return;
    
    seedInFlightRef.current = true;
    try {
      // Load all conversations (cursor pagination) to build an accurate total.
      // Safety cap avoids accidental infinite loops.
      const capPages = 25;
      const capItems = 800;
      let cursor = null;
      let page = 0;
      let seen = 0;
      const nextMap = new Map();

      while (page < capPages && seen < capItems) {
        const data = await conversationsApi.list({ cursor, pageSize: 100 });
        const results = Array.isArray(data?.results) ? data.results : [];
        for (const c of results) {
          const id = toIdNum(c?.id);
          if (id == null) continue;
          const unread = getUnreadMessagesCount(c);
          nextMap.set(id, unread > 0 ? 1 : 0);
          seen += 1;
          if (seen >= capItems) break;
        }
        cursor = data?.next ?? null;
        page += 1;
        if (!cursor) break;
      }

      setUnreadByConvId(nextMap);
    } catch {
      // ignore: badge can still be driven by realtime updates
    } finally {
      seedInFlightRef.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadByConvId(new Map());
      seedInFlightRef.current = false;
      return;
    }
    void seedFromServer();
  }, [isAuthenticated, seedFromServer]);

  // Realtime: update per-conversation unread counters, then totalUnread is derived.
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubMsg = subscribe("message.created", (payload) => {
      const convId = payload?.conversationId ?? payload?.message?.conversation ?? null;
      const unread = payload?.unreadCount;
      if (convId == null || unread == null) return;
      setConversationUnread(convId, unread);
    });

    const unsubConv = subscribe("conversation.updated", (payload) => {
      const conv = payload?.conversation ?? null;
      const convId = conv?.id ?? null;
      if (convId == null) return;
      setConversationUnread(convId, getUnreadMessagesCount(conv));
    });

    return () => {
      unsubMsg?.();
      unsubConv?.();
    };
  }, [isAuthenticated, setConversationUnread, subscribe]);

  const totalUnread = useMemo(() => {
    let sum = 0;
    for (const v of unreadByConvId.values()) sum += Number(v) ? 1 : 0;
    return sum;
  }, [unreadByConvId]);

  const value = useMemo(
    () => ({
      totalUnread,
      unreadByConvId,
      setConversationUnread,
      seedFromServer,
    }),
    [seedFromServer, setConversationUnread, totalUnread, unreadByConvId]
  );

  return <ChatUnreadContext.Provider value={value}>{children}</ChatUnreadContext.Provider>;
}

export function useChatUnread() {
  const ctx = useContext(ChatUnreadContext);
  if (!ctx) throw new Error("useChatUnread must be used within <ChatUnreadProvider>");
  return ctx;
}

