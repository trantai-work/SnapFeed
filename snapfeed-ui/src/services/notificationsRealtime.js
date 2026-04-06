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

export function connectNotificationsSocket({ onMessage, onOpen, onClose } = {}) {
  const url = buildWsUrl("/ws/notifications");
  const ws = new WebSocket(url);

  ws.addEventListener("open", () => onOpen?.());
  ws.addEventListener("close", () => onClose?.());
  ws.addEventListener("message", (ev) => {
    try {
      const data = JSON.parse(ev.data);
      onMessage?.(data);
    } catch {
      // ignore
    }
  });

  return ws;
}

