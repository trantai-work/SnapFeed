import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { connectRealtimeSocket } from "../services/realtime";
import { useAuth } from "./AuthContext";

const RealtimeSocketContext = createContext(null);

export function RealtimeSocketProvider({ children }) {
  const { isAuthenticated } = useAuth();

  const wsRef = useRef(null);
  const listenersByTypeRef = useRef(new Map()); // type -> Set<fn>
  const anyListenersRef = useRef(new Set()); // Set<fn>

  const subscribe = useCallback((type, listener) => {
    if (typeof type === "function" && listener == null) {
      const fn = type;
      anyListenersRef.current.add(fn);
      return () => anyListenersRef.current.delete(fn);
    }

    if (!type || typeof listener !== "function") return () => {};
    const key = String(type);
    const set = listenersByTypeRef.current.get(key) ?? new Set();
    set.add(listener);
    listenersByTypeRef.current.set(key, set);
    return () => {
      const cur = listenersByTypeRef.current.get(key);
      if (!cur) return;
      cur.delete(listener);
      if (cur.size === 0) listenersByTypeRef.current.delete(key);
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

    wsRef.current = connectRealtimeSocket({
      onMessage: (data) => {
        const type = data?.type ?? null;
        for (const fn of anyListenersRef.current) {
          try {
            fn(data);
          } catch (e) {
            console.error("[RealtimeSocket] listener error", e);
          }
        }
        if (!type) return;
        const set = listenersByTypeRef.current.get(String(type));
        if (!set) return;
        for (const fn of set) {
          try {
            fn(data?.payload ?? null, data);
          } catch (e) {
            console.error("[RealtimeSocket] typed listener error", e);
          }
        }
      },
      onClose: () => {
        wsRef.current = null;
      },
      onError: (e) => console.error("[RealtimeSocket] ws error", e),
    });

    return () => {
      wsRef.current?.close?.();
      wsRef.current = null;
    };
  }, [isAuthenticated]);

  const send = useCallback((type, payload) => {
    if (!wsRef.current) {
      console.warn("[RealtimeSocket] cannot send, no active connection");
      return;
    }
    console.log("[RealtimeSocket] Sending message:", type, payload);
    wsRef.current.send({ type, payload });
  }, []);

  const value = useMemo(() => ({ subscribe, send }), [subscribe, send]);

  return (
    <RealtimeSocketContext.Provider value={value}>
      {children}
    </RealtimeSocketContext.Provider>
  );
}

export function useRealtimeSocket() {
  const ctx = useContext(RealtimeSocketContext);
  if (!ctx) throw new Error("useRealtimeSocket must be used within <RealtimeSocketProvider>");
  return ctx;
}

