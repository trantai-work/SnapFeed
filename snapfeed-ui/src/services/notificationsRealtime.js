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

export function connectNotificationsSocket({
  onMessage,
  onOpen,
  onClose,
  onError,
  autoRefreshOn4401 = true,
} = {}) {
  const url = buildWsUrl("/ws/notifications");
  let ws = null;
  let closedByUser = false;
  let reconnectAttempt = 0;

  const connect = () => {
    ws = new WebSocket(url);

    ws.addEventListener("open", () => {
      reconnectAttempt = 0;
      onOpen?.();
    });

    ws.addEventListener("error", (ev) => onError?.(ev));

    ws.addEventListener("close", async (ev) => {
      onClose?.(ev);
      if (closedByUser) return;
      if (!autoRefreshOn4401) return;
      if (ev?.code !== 4401) return;

      try {
        await refreshAccessTokenOnce();
      } catch {
        console.error("[ws/notifications] refresh token failed; not reconnecting", ev);
        return;
      }

      const waitMs = Math.min(8000, 500 * 2 ** reconnectAttempt);
      console.info(
        `[ws/notifications] reconnecting after 4401 in ${waitMs}ms (attempt ${
          reconnectAttempt + 1
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
        console.error("[ws/notifications] failed to parse message", ev?.data);
      }
    });

    return ws;
  };

  connect();

  return {
    get socket() {
      return ws;
    },
    close() {
      closedByUser = true;
      try {
        ws?.close?.();
      } catch {
        // ignore
      }
    },
  };
}

