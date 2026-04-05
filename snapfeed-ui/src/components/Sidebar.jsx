import { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Home as HomeIcon,
  Send,
  MessageSquare,
  Upload,
  User,
  Search,
} from "lucide-react";

import logo from "../assets/logo.png";
import logoLightMode from "../assets/logo_light_mode.png";
import AuthModal from "./AuthModal";
import NotificationsPanel from "./NotificationsPanel";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { authService } from "../services/auth.service";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function Sidebar({ mobileOpen = false, onMobileClose = () => {} }) {
  const { theme } = useTheme();
  const { isAuthenticated, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const recentProvider = useMemo(() => {
    return window.localStorage.getItem("auth_recent_provider") || null;
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setNotificationsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notificationsOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (notificationsOpen) {
        setNotificationsOpen(false);
        return;
      }
      onMobileClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, notificationsOpen, onMobileClose]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const menu = [
    { icon: HomeIcon, label: "Đề xuất", path: "/", public: true },
    { icon: Send, label: "Tin nhắn", path: "chats" },
    { icon: MessageSquare, label: "Thông báo", path: "notifications" },
    { icon: Upload, label: "Tải lên", path: "upload" },
    { icon: User, label: "Hồ sơ", path: "profile" },
  ];

  if (loading) return null;

  const panelClass = classNames(
    "flex min-h-0 w-[min(18rem,88vw)] flex-col border-r border-gray-200 bg-white p-4 text-gray-900 transition-colors dark:border-transparent dark:bg-black dark:text-white",
    "fixed left-0 top-0 z-[60] h-[100dvh] shadow-xl transition-transform duration-300 ease-out will-change-transform lg:will-change-auto",
    "lg:static lg:z-auto lg:h-screen lg:w-64 lg:translate-x-0 lg:shadow-none",
    mobileOpen ? "translate-x-0" : "max-lg:-translate-x-full max-lg:pointer-events-none"
  );

  return (
    <>
      <button
        type="button"
        aria-label="Đóng menu"
        className={classNames(
          "fixed inset-0 z-[55] bg-black/50 transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onMobileClose}
      />

      <aside className={panelClass} aria-hidden={false}>
            <div className="mb-4 flex items-center gap-2">
              <img
                src={theme === "light" ? logoLightMode : logo}
                alt="SnapFeed"
                className="h-20 max-h-[min(22vh,8.5rem)] w-auto max-w-full object-contain lg:h-28 lg:max-h-none"
              />
            </div>

            <div className="mb-4 flex items-center rounded-full bg-gray-100 px-4 py-2 dark:bg-gray-800">
              <Search size={16} className="text-gray-500 dark:text-gray-400" />
              <input
                placeholder="Tìm kiếm"
                className="ml-2 w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-500 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>

            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
              {menu.map((item, index) => {
                const Icon = item.icon;
                const requiresAuth = !item.public;
                if (item.path === "notifications") {
                  return (
                    <button
                      key={index}
                      type="button"
                      aria-expanded={notificationsOpen}
                      onClick={() => {
                        if (!isAuthenticated) {
                          setAuthOpen(true);
                          return;
                        }
                        setNotificationsOpen((open) => !open);
                      }}
                      className={classNames(
                        "flex w-full cursor-pointer items-center gap-3 rounded-lg p-3 text-left transition-colors",
                        "hover:bg-gray-100 active:bg-gray-200/80 dark:hover:bg-gray-800 dark:active:bg-gray-700/80",
                        notificationsOpen &&
                          "bg-gray-100 font-semibold dark:bg-gray-800/90"
                      )}
                    >
                      <Icon size={20} />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                }
                return (
                  <NavLink
                    key={index}
                    to={item.path}
                    onClick={(e) => {
                      if (!isAuthenticated && requiresAuth) {
                        e.preventDefault();
                        setAuthOpen(true);
                        return;
                      }
                      onMobileClose();
                    }}
                    className={({ isActive }) =>
                      classNames(
                        "flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800",
                        isActive ? "font-semibold text-pink-500" : ""
                      )
                    }
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="mt-auto space-y-2 border-t border-gray-200 pt-6 text-sm text-gray-500 dark:border-gray-800">
              <Link
                to="/privacy-policy"
                className="block text-xs text-gray-500 transition-colors hover:text-gray-800 dark:hover:text-gray-300"
                onClick={onMobileClose}
              >
                Chính sách quyền riêng tư
              </Link>
              <div className="pt-2 text-xs">© 2026 SnapFeed</div>
            </div>
      </aside>

      {notificationsOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[100] cursor-default bg-black/45 backdrop-blur-[1px] transition-opacity dark:bg-black/55"
            aria-label="Đóng lớp thông báo"
            onClick={() => setNotificationsOpen(false)}
          />
          <div
            className="fixed left-0 top-0 z-[110] flex h-[100dvh] w-full max-w-[min(48rem,100vw)] flex-col border-r border-zinc-200/90 bg-white shadow-2xl dark:border-zinc-800 dark:bg-black sm:max-w-[min(52rem,100vw)] lg:max-w-[28rem]"
          >
            <NotificationsPanel onClose={() => setNotificationsOpen(false)} />
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
