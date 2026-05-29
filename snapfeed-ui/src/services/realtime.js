import { refreshAccessTokenOnce } from "./wsAuth";

function buildWsUrl(path) {
  const explicit = import.meta.env.VITE_WS_URL;
  if (explicit && typeof explicit === "string" && explicit.length > 0) {
    return `${explicit.replace(/\/+$/, "")}${path}`;
  }

  // Fallback: derive from VITE_API_URL (e.g. http://host/api/v1 -> ws://host)
  const api = import.meta.env.VITE_API_URL || "";
  try {
    const u = new URL(api);
    const proto = u.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${u.host}${path}`;
  } catch {
    return path;
  }
}

export function connectRealtimeSocket({
  onMessage,
  onOpen,
  onClose,
  onError,
  autoRefreshOn4401 = true,
} = {}) {
  const url = buildWsUrl("/ws/realtime");
  let ws = null;
  let closedByUser = false;
  let reconnectAttempt = 0;

  const connect = () => {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return ws;
    }

    ws = new WebSocket(url);

    ws.addEventListener("open", () => {
      reconnectAttempt = 0;
      onOpen?.();
    });
    ws.addEventListener("error", (ev) => onError?.(ev));
    ws.addEventListener("close", async (ev) => {
      onClose?.(ev);
      if (closedByUser) return;

      if (autoRefreshOn4401 && ev?.code === 4401) {
        try {
          await refreshAccessTokenOnce();
        } catch {
          console.error("[ws/realtime] refresh token failed; not reconnecting", ev);
          return;
        }
      }

      const waitMs = Math.min(10000, 1000 * 2 ** reconnectAttempt);
      console.info(
        `[ws/realtime] reconnecting in ${waitMs}ms (attempt ${reconnectAttempt + 1
        })`
      );
      reconnectAttempt += 1;
      setTimeout(() => {
        if (!closedByUser) connect();
      }, waitMs);
    });

    ws.addEventListener("message", (ev) => {
      try {
        const data = JSON.parse(ev.data);
        onMessage?.(data);
      } catch {
        console.error("[ws/realtime] failed to parse message", ev?.data);
      }
    });

    return ws;
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      if (!closedByUser && (!ws || (ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING))) {
        console.info("[ws/realtime] page visible, triggering reconnect for idle/dead socket");
        reconnectAttempt = 0;
        connect();
      }
    }
  };
  document.addEventListener("visibilitychange", handleVisibilityChange);

  connect();

  return {
    get socket() {
      return ws;
    },
    close() {
      closedByUser = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      try {
        ws?.close?.();
      } catch {
        // ignore
      }
    },
    send(data) {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      } else {
        console.warn("[ws/realtime] cannot send message, socket not open", data);
      }
    },
  };
}

