import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Bell, Home as HomeIcon, Send, Upload, User } from "lucide-react";

import AuthModal from "./AuthModal";
import NotificationsPanel from "./NotificationsPanel";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { authService } from "../services/auth.service";
import { notificationsApi } from "../api/notifications.api";
import { conversationsApi } from "../api/conversations.api";
import { commentsApi } from "../api/comments.api";
import { connectNotificationsSocket } from "../services/notificationsRealtime";
import { onAuthModalOpen, openAuthModal } from "../utils/authModalBus";
import { useMessageBox } from "./MessageBox";
import { authApi } from "../api";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

const iconBtnClass = classNames(
  "group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl transition-colors",
  "hover:bg-gray-100 active:bg-gray-200/70 dark:hover:bg-white/10 dark:active:bg-white/15"
);

function IconNavLink({ to, label, Icon, onClick, disabled }) {
  if (disabled) {
    return (
      <button type="button" className={iconBtnClass} aria-label={label} onClick={onClick}>
        <Icon size={22} />
      </button>
    );
  }

  return (
    <NavLink
      to={to}
      aria-label={label}
      onClick={onClick}
      className={({ isActive }) =>
        classNames(iconBtnClass, isActive ? "text-pink-500" : "")
      }
    >
      <Icon size={22} />
    </NavLink>
  );
}

export default function SimpleSideBar() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, setUser } = useAuth();
  const { show } = useMessageBox();

  const [authOpen, setAuthOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadFetchLock = useRef(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const chatUnreadFetchLock = useRef(false);
  const wsRef = useRef(null);
  const chatUnreadPollRef = useRef(null);
  const [incomingRecipient, setIncomingRecipient] = useState(null);
  const recentProvider = useMemo(() => {
    return window.localStorage.getItem("auth_recent_provider") || null;
  }, []);

  useEffect(() => {
    return onAuthModalOpen(() => setAuthOpen(true));
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setNotificationsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notificationsOpen]);

  const refreshUnread = useCallback(async () => {
    if (!isAuthenticated || unreadFetchLock.current) return;
    unreadFetchLock.current = true;
    try {
      const c = await notificationsApi.unreadCount();
      setUnreadCount(c);
    } catch (e) {
      console.error(e);
    } finally {
      unreadFetchLock.current = false;
    }
  }, [isAuthenticated]);

  const refreshChatUnread = useCallback(async () => {
    if (!isAuthenticated || chatUnreadFetchLock.current) return;
    chatUnreadFetchLock.current = true;
    try {
      const c = await conversationsApi.unreadCount();
      setChatUnreadCount(c);
    } catch (e) {
      console.error(e);
    } finally {
      chatUnreadFetchLock.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setChatUnreadCount(0);
      return;
    }
    refreshUnread();
    refreshChatUnread();
  }, [isAuthenticated, refreshUnread, refreshChatUnread]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    if (wsRef.current) return;
    wsRef.current = connectNotificationsSocket({
      onMessage: (msg) => {
        if (!msg || typeof msg !== "object") return;
        if (msg.type === "notification.created") {
          const payload = msg.payload || {};
          const c = payload.unread_count;
          if (typeof c === "number") setUnreadCount(c);
          if (payload.recipient) setIncomingRecipient(payload.recipient);
          if (payload.recipient?.notification) {
            const n = payload.recipient.notification;
            const actorId = n?.actor?.id ?? null;
            const target = n?.target ?? null;
            const recipientId = payload.recipient?.id ?? null;
            show({
              status: "notification",
              title: n.title || "Thông báo mới",
              message: n.message || "",
              duration: 6500,
              onClick: async (meta) => {
                const target = meta?.target ?? null;
                if (!target?.type || !target?.id) return;
                setNotificationsOpen(false);
                if (meta?.recipientId) {
                  try {
                    await notificationsApi.markRead(meta.recipientId);
                    refreshUnread();
                  } catch {
                    // ignore
                  }
                }
                if (target.type === "videos.video") {
                  navigate("/profile", { state: { openVideoId: target.id } });
                  return;
                }
                if (target.type === "comments.videocomment") {
                  const c = await commentsApi.getById(target.id);
                  const vid = c?.video;
                  if (vid) navigate("/profile", { state: { openVideoId: vid } });
                }
              },
              meta: { actorId, target, recipientId },
            });
          }
          return;
        }
        if (msg.type === "notification.read") {
          const payload = msg.payload || {};
          const c = payload.unread_count;
          if (typeof c === "number") setUnreadCount(c);
        }
      },
      onClose: () => {
        wsRef.current = null;
      },
    });

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, navigate, refreshUnread, show]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Keep chat unread badge fresh without opening another /ws/chats socket.
    if (chatUnreadPollRef.current) clearInterval(chatUnreadPollRef.current);
    chatUnreadPollRef.current = setInterval(() => {
      refreshChatUnread();
    }, 15000);

    return () => {
      if (chatUnreadPollRef.current) {
        clearInterval(chatUnreadPollRef.current);
        chatUnreadPollRef.current = null;
      }
    };
  }, [isAuthenticated, refreshChatUnread]);

  if (loading) return null;

  const requireAuth = (cb) => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    cb?.();
  };

  return (
    <>
      <aside
        className={classNames(
          "flex h-[100dvh] w-20 shrink-0 flex-col items-center gap-3 border-r border-gray-200 bg-white px-3 py-4",
          "dark:border-white/10 dark:bg-black"
        )}
      >
        <div className="relative flex flex-col items-center gap-2">
          <IconNavLink
            to="/"
            label="Đề xuất"
            Icon={HomeIcon}
            onClick={() => setNotificationsOpen(false)}
          />
          <IconNavLink
            to="/chats"
            label="Tin nhắn"
            Icon={Send}
            onClick={() => setNotificationsOpen(false)}
          />
          {chatUnreadCount > 0 ? (
            <span
              className="pointer-events-none absolute right-[6px] top-[58px] flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[0.65rem] font-bold leading-none text-white shadow-sm ring-2 ring-white dark:ring-black"
              aria-label={`${chatUnreadCount} cuộc trò chuyện chưa đọc`}
            >
              {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
            </span>
          ) : null}

          <button
            type="button"
            aria-label="Thông báo"
            className={iconBtnClass}
            onClick={() =>
              requireAuth(() => setNotificationsOpen((open) => !open))
            }
          >
            <span className="relative">
              <Bell size={22} />
              {unreadCount > 0 ? (
                <span
                  className="absolute -right-2.5 -top-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[0.65rem] font-bold leading-none text-white shadow-sm ring-2 ring-white dark:ring-black"
                  aria-label={`${unreadCount} thông báo chưa đọc`}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </span>
          </button>

          <IconNavLink
            to="/upload"
            label="Tải lên"
            Icon={Upload}
            onClick={(e) => {
              e?.preventDefault?.();
              requireAuth(() => navigate("/upload"));
            }}
            disabled
          />

          <IconNavLink
            to="/profile"
            label="Hồ sơ"
            Icon={User}
            onClick={(e) => {
              e?.preventDefault?.();
              requireAuth(() => navigate("/profile"));
            }}
            disabled
          />
        </div>

        <div className="mt-auto flex flex-col items-center gap-2 pt-2">
          {isAuthenticated ? (
            <>
              <button
                type="button"
                className={classNames(
                  "flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/10",
                  "hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-white/15 dark:active:bg-white/20 transition-colors"
                )}
                aria-label="Tài khoản"
                onClick={() => navigate("/profile")}
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username || ""}
                    className="h-9 w-9 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-gray-300 dark:bg-white/10" />
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={classNames(
                "flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f6339a] text-white",
                "hover:brightness-110 active:brightness-95 transition"
              )}
              aria-label="Đăng nhập"
              onClick={() => setAuthOpen(true)}
            >
              <span className="text-xs font-semibold">In</span>
            </button>
          )}
        </div>
      </aside>

      {notificationsOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[100] cursor-default bg-black/45 backdrop-blur-[1px] transition-opacity dark:bg-black/55"
            aria-label="Đóng lớp thông báo"
            onClick={() => {
              setNotificationsOpen(false);
              refreshUnread();
            }}
          />
          <div className="fixed left-0 top-0 z-[110] flex h-[100dvh] w-full max-w-[min(48rem,100vw)] flex-col border-r border-zinc-200/90 bg-white shadow-2xl dark:border-zinc-800 dark:bg-black sm:max-w-[min(52rem,100vw)] lg:max-w-[28rem]">
            <NotificationsPanel
              onClose={() => {
                setNotificationsOpen(false);
                refreshUnread();
              }}
              incomingRecipient={incomingRecipient}
              onItemMarkedRead={() => refreshUnread()}
            />
          </div>
        </>
      ) : null}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        recentProvider={recentProvider}
        onLoginGoogle={() => {
          window.localStorage.setItem("auth_recent_provider", "google");
          authService.loginWithGoogle();
        }}
        onLoginFacebook={() => {
          window.localStorage.setItem("auth_recent_provider", "facebook");
          authService.loginWithFacebook();
        }}
      />
    </>
  );
}

