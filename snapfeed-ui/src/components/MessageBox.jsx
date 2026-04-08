import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, AlertTriangle, XCircle, X, Bell } from "lucide-react";

const MessageBoxContext = createContext(null);

const STATUS_STYLES = {
  success: {
    icon: CheckCircle2,
    accent: "bg-emerald-500",
    iconWrap: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  error: {
    icon: XCircle,
    accent: "bg-rose-500",
    iconWrap: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  },
  warning: {
    icon: AlertTriangle,
    accent: "bg-amber-500",
    iconWrap: "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  },
  notification: {
    icon: Bell,
    accent: "bg-sky-500",
    iconWrap: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  },
};

function safeStatus(status) {
  return STATUS_STYLES[status] ? status : "success";
}

export function MessageBoxProvider({ children, maxVisible = 4 }) {
  const [items, setItems] = useState([]);
  const timersRef = useRef(new Map());

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
    const t = timersRef.current.get(id);
    if (t) clearTimeout(t);
    timersRef.current.delete(id);
  }, []);

  const show = useCallback(
    ({ status = "success", title = "", message = "", duration = 7500 } = {}) => {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

      const next = {
        id,
        status: safeStatus(status),
        title,
        message,
        createdAt: Date.now(),
      };

      setItems((prev) => {
        const merged = [next, ...prev];
        return merged.slice(0, maxVisible);
      });

      if (duration !== 0) {
        const t = setTimeout(() => remove(id), duration);
        timersRef.current.set(id, t);
      }

      return id;
    },
    [maxVisible, remove]
  );

  const api = useMemo(() => ({ show, remove }), [show, remove]);

  return (
    <MessageBoxContext.Provider value={api}>
      {children}
      <MessageBoxStack items={items} onClose={remove} />
    </MessageBoxContext.Provider>
  );
}

export function useMessageBox() {
  const ctx = useContext(MessageBoxContext);
  if (!ctx) {
    throw new Error("useMessageBox must be used within <MessageBoxProvider>");
  }
  return ctx;
}

function MessageBoxStack({ items, onClose }) {
  return (
    <div
      className={[
        "fixed z-[9999] flex w-[min(460px,calc(100vw-2rem))] flex-col gap-3 pointer-events-none",
        // Mobile: top-right (doesn't cover bottom UI).
        "right-4 top-4 left-auto bottom-auto",
        // Desktop/tablet: bottom-left.
        "sm:left-4 sm:bottom-4 sm:right-auto sm:top-auto",
      ].join(" ")}
    >
      {items.map((item) => (
        <MessageToast key={item.id} item={item} onClose={onClose} />
      ))}
    </div>
  );
}

function MessageToast({ item, onClose }) {
  const styles = STATUS_STYLES[item.status] ?? STATUS_STYLES.success;
  const Icon = styles.icon;

  return (
    <div className="pointer-events-auto">
      <div
        className={[
          "relative overflow-hidden rounded-2xl ring-1 ring-black/5 shadow-lg shadow-black/10 backdrop-blur-md",
          "bg-white/95 text-zinc-900 dark:bg-zinc-950/85 dark:text-zinc-50",
          "dark:ring-white/10 dark:shadow-black/40",
        ].join(" ")}
      >
        <div className={["absolute left-0 top-0 h-full w-1.5", styles.accent].join(" ")} />

        <div className="relative flex gap-3.5 p-4 pl-5 pr-11">
          <div className={["mt-0.5 grid h-9 w-9 place-items-center rounded-xl", styles.iconWrap].join(" ")}>
            <Icon size={18} />
          </div>

          <div className="min-w-0">
            {item.title ? (
              <div className="text-sm font-semibold leading-5">
                {item.title}
              </div>
            ) : null}
            {item.message ? (
              <div className="mt-0.5 text-sm leading-5 text-zinc-600 dark:text-zinc-300">
                {item.message}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => onClose(item.id)}
            className="absolute right-3 top-3 rounded-lg p-2 text-zinc-500 transition hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
