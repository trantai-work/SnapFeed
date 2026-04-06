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
    border: "border-emerald-200 dark:border-emerald-800/80",
    title: "text-gray-900 dark:text-zinc-100",
    text: "text-gray-700 dark:text-zinc-300",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    icon: XCircle,
    border: "border-red-200 dark:border-red-900/80",
    title: "text-gray-900 dark:text-zinc-100",
    text: "text-gray-700 dark:text-zinc-300",
    iconColor: "text-red-600 dark:text-red-400",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-amber-200 dark:border-amber-900/80",
    title: "text-gray-900 dark:text-zinc-100",
    text: "text-gray-700 dark:text-zinc-300",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  notification: {
    icon: Bell,
    border: "border-sky-200 dark:border-sky-900/70",
    title: "text-gray-900 dark:text-zinc-100",
    text: "text-gray-700 dark:text-zinc-300",
    iconColor: "text-sky-600 dark:text-sky-400",
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
          "relative overflow-hidden rounded-2xl border shadow-lg shadow-black/10 dark:shadow-black/40",
          "bg-white dark:bg-zinc-900",
          styles.border,
        ].join(" ")}
      >
        <div className="relative p-5 pr-12 flex gap-4">
          <div className="mt-0.5">
            <Icon size={24} className={styles.iconColor} />
          </div>

          <div className="min-w-0">
            {item.title ? (
              <div className={["text-base font-semibold leading-6", styles.title].join(" ")}>
                {item.title}
              </div>
            ) : null}
            {item.message ? (
              <div className={["text-base leading-6 mt-0.5", styles.text].join(" ")}>
                {item.message}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => onClose(item.id)}
            className="absolute top-3.5 right-3.5 rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
