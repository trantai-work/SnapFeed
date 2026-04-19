import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { connectChatsInboxSocket } from "../services/chatsRealtime";
import { useAuth } from "./AuthContext";

const ChatsSocketContext = createContext(null);

export function ChatsSocketProvider({ children }) {
  const { isAuthenticated } = useAuth();

  const wsRef = useRef(null);
  const listenersRef = useRef(new Set()); // (data) => void

  const subscribe = useCallback((listener) => {
    if (typeof listener !== "function") return () => {};
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      wsRef.current?.close?.();
      wsRef.current = null;
      return;
    }

    // Ensure only one shared websocket connection app-wide.
    if (wsRef.current) return;

    wsRef.current = connectChatsInboxSocket({
      onMessage: (data) => {
        for (const fn of listenersRef.current) {
          try {
            fn(data);
          } catch (e) {
            console.error("[ChatsSocket] listener error", e);
          }
        }
      },
      onClose: () => {
        wsRef.current = null;
      },
      onError: (e) => console.error("[ChatsSocket] ws error", e),
    });

    return () => {
      wsRef.current?.close?.();
      wsRef.current = null;
    };
  }, [isAuthenticated]);

  const value = useMemo(() => ({ subscribe }), [subscribe]);

  return (
    <ChatsSocketContext.Provider value={value}>
      {children}
    </ChatsSocketContext.Provider>
  );
}

export function useChatsSocket() {
  const ctx = useContext(ChatsSocketContext);
  if (!ctx) {
    throw new Error("useChatsSocket must be used within <ChatsSocketProvider>");
  }
  return ctx;
}

