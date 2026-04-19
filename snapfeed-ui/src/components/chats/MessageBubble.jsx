import { fullName } from "../../utils/chat";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function MessageBubble({ msg, meId, conversation }) {
  const sender = msg?.sender ?? null;
  const isMine = !!meId && sender?.id === meId;
  const content = String(msg?.content ?? "").trim();

  if (!content) return null;

  const avatar = sender?.avatarUrl || null;
  const initials = (() => {
    const f = String(sender?.firstName ?? "").trim();
    const l = String(sender?.lastName ?? "").trim();
    if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
    if (f) return f.slice(0, 2).toUpperCase();
    const u = String(sender?.username ?? "").trim();
    return u ? u.slice(0, 2).toUpperCase() : "?";
  })();

  return (
    <div
      className={classNames(
        "flex items-end gap-2",
        isMine ? "justify-end" : "justify-start"
      )}
    >
      {!isMine ? (
        avatar ? (
          <img
            src={avatar}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-200 text-[11px] font-bold text-gray-700 dark:bg-white/10 dark:text-white/80">
            {initials}
          </div>
        )
      ) : null}

      <div
        className={classNames(
          "max-w-[min(78%,44rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-snug shadow-sm",
          isMine
            ? "bg-sky-500 text-white shadow-sky-500/10"
            : "bg-white/70 text-gray-900 ring-1 ring-black/5 backdrop-blur-sm dark:bg-white/10 dark:text-white dark:ring-white/10"
        )}
        aria-label={sender ? fullName(sender) : "Tin nhắn"}
      >
        {content}
      </div>
    </div>
  );
}

