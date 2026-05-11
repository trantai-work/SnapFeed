import { buildConversationName } from "../../utils/chat";
import { formatRelativeTimeVi } from "../../utils/format";
import ConversationAvatar from "./ConversationAvatar";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function ConversationListItem({ active = false, conv, meId, onClick }) {
  const name = buildConversationName(conv, meId);
  const lastSenderId =
    conv?.lastMessage?.senderId ??
    conv?.last_message?.sender_id ??
    conv?.lastMessage?.sender?.id ??
    conv?.last_message?.sender?.id ??
    null;
  const isMine = !!meId && lastSenderId === meId;
  const lastContent = String(
    conv?.lastMessage?.content ?? conv?.last_message?.content ?? ""
  ).trim();
  const attachmentType = conv?.lastMessage?.attachmentType ?? conv?.last_message?.attachment_type ?? null;
  
  let subtitleText = lastContent;
  if (lastContent.startsWith("[CALL_MISSED]")) {
    subtitleText = "Cuộc gọi nhỡ";
  } else if (lastContent.startsWith("[CALL_ENDED]")) {
    subtitleText = "Cuộc gọi video";
  } else if (!lastContent && attachmentType) {
    subtitleText = attachmentType === "image" ? "Đã gửi một ảnh" : "Đã gửi một file đính kèm";
  }

  const subtitle = subtitleText
    ? isMine
      ? `Bạn: ${subtitleText}`
      : subtitleText
    : "Chưa có tin nhắn";
  const timeSrc =
    conv?.lastMessage?.createdAt ??
    conv?.last_message?.created_at ??
    conv?.lastMessageAt ??
    conv?.last_message_at ??
    null;
  const timeLabel = formatRelativeTimeVi(timeSrc);
  const unread = Number(conv?.unreadCount ?? conv?.unread_count ?? 0) || 0;

  const subtitleClass =
    unread > 0
      ? "text-gray-900 font-semibold dark:text-white/95"
      : "text-gray-600 dark:text-white/60";

  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors outline-none",
        "hover:bg-gray-100 active:bg-gray-200/70 dark:hover:bg-white/10 dark:active:bg-white/15",
        active ? "bg-gray-100 dark:bg-white/10" : "",
        "focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
      )}
    >
      <ConversationAvatar conv={conv} meId={meId} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-semibold">{name}</div>
          <div className="flex shrink-0 items-center gap-2">
            {unread > 0 ? (
              <span className="h-2 w-2 rounded-full bg-pink-500" aria-label="Chưa đọc" />
            ) : null}
            <div className="text-[0.7rem] text-gray-500 dark:text-white/50">
              {timeLabel}
            </div>
          </div>
        </div>

        <div
          className={classNames(
            "text-xs overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]",
            subtitleClass
          )}
        >
          {subtitle}
        </div>
      </div>
    </button>
  );
}

