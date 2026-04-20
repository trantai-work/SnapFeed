import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const ChatUIContext = createContext(null);

export function ChatUIProvider({ children }) {
  const [activeConversationId, setActiveConversationId] = useState(null);

  const setActive = useCallback((conversationId) => {
    const n = Number(conversationId);
    setActiveConversationId(Number.isFinite(n) ? n : null);
  }, []);

  const value = useMemo(
    () => ({
      activeConversationId,
      setActiveConversationId: setActive,
    }),
    [activeConversationId, setActive]
  );

  return <ChatUIContext.Provider value={value}>{children}</ChatUIContext.Provider>;
}

export function useChatUI() {
  const ctx = useContext(ChatUIContext);
  if (!ctx) throw new Error("useChatUI must be used within <ChatUIProvider>");
  return ctx;
}

