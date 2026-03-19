import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";

const MessageBoxContext = createContext(null);

const STATUS_STYLES = {
  success: {
    icon: CheckCircle2,
    border: "border-emerald-200",
    title: "text-gray-900",
    text: "text-gray-700",
    iconColor: "text-emerald-600",
  },
  error: {
    icon: XCircle,
    border: "border-red-200",
    title: "text-gray-900",
    text: "text-gray-700",
    iconColor: "text-red-600",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-amber-200",
    title: "text-gray-900",
    text: "text-gray-700",
    iconColor: "text-amber-600",
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
    <div className="fixed left-4 bottom-4 z-[9999] flex flex-col gap-3 w-[min(460px,calc(100vw-2rem))] pointer-events-none">
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
          "relative overflow-hidden rounded-2xl border shadow-lg shadow-black/10",
          "bg-white",
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
            className="absolute top-3.5 right-3.5 p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
