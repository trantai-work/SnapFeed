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
    ({
      status = "success",
      title = "",
      message = "",
      duration = 7500,
      onClick,
      meta,
    } = {}) => {
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
        onClick: typeof onClick === "function" ? onClick : null,
        meta: meta ?? null,
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
        "fixed z-[9999] pointer-events-none",
        "left-1/2 top-4 -translate-x-1/2",
        "flex w-[min(520px,calc(100vw-2rem))] flex-col gap-3",
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
  const avatarUrl = item?.meta?.avatarUrl ?? null;
  const imageType = item?.meta?.imageType ?? "avatar";

  let wrapperClass = "mt-0.5 grid shrink-0 overflow-hidden place-items-center ";
  if (imageType === "thumbnail") {
    wrapperClass += "h-[3.25rem] w-8 rounded-lg bg-black ring-1 ring-black/5 dark:ring-white/10";
  } else if (imageType === "logo") {
    wrapperClass += "h-10 w-10 rounded-2xl bg-gradient-to-tr from-pink-50 to-pink-100 ring-1 ring-pink-200/60 dark:from-pink-950/40 dark:to-pink-900/40 dark:ring-pink-500/20";
  } else {
    wrapperClass += "h-10 w-10 rounded-2xl " + styles.iconWrap;
  }

  return (
    <div className="pointer-events-auto">
      <div
        className={[
          "relative overflow-hidden rounded-3xl ring-1 ring-black/5 shadow-xl shadow-black/10 backdrop-blur-md",
          "bg-white/95 text-zinc-900 dark:bg-zinc-950/85 dark:text-zinc-50",
          "dark:ring-white/10 dark:shadow-black/40",
          "animate-[messagebox-in_240ms_ease-out]",
          item.onClick ? "cursor-pointer" : "",
        ].join(" ")}
        onClick={async () => {
          if (!item.onClick) return;
          await item.onClick(item.meta);
          onClose(item.id);
        }}
      >
        <div className={["absolute left-0 top-0 h-full w-1.5", styles.accent].join(" ")} />

        <div className="relative flex gap-4 p-4.5 pl-5.5 pr-12">
          <div className={wrapperClass}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className={imageType === "logo" ? "h-6 w-6 object-contain drop-shadow-sm" : "h-full w-full object-cover"}
                referrerPolicy="no-referrer"
              />
            ) : (
              <Icon size={18} />
            )}
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
            onClick={(e) => {
              e.stopPropagation();
              onClose(item.id);
            }}
            className="absolute right-3.5 top-3.5 rounded-xl p-2 text-zinc-500 transition hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
