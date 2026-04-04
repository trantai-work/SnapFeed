import React, { useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import AuthModal from "../AuthModal";
import ThemeToggle from "../ThemeToggle";
import TopbarDropdown from "./TopbarDropdown";
import { authApi } from "../../api";
import { authService } from "../../services/auth.service";

export default function TopbarAction({ onOpenMobileNav }) {
    const { user, isAuthenticated, loading, setUser } = useAuth();
    const navigate = useNavigate();
    const [authOpen, setAuthOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const recentProvider = useMemo(() => {
      return window.localStorage.getItem("auth_recent_provider") || null;
    }, []);

    if (loading) return null;

    return (
        <>
        <button
          type="button"
          className="fixed left-2 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200/90 bg-white/95 text-gray-800 shadow-md backdrop-blur-md transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-[#1f1f1f]/95 dark:text-white dark:hover:bg-white/10 sm:left-3 sm:top-3 sm:h-11 sm:w-11 lg:hidden"
          onClick={() => onOpenMobileNav?.()}
          aria-label="Mở menu"
        >
          <Menu className="h-[1.15rem] w-[1.15rem] sm:h-[1.35rem] sm:w-[1.35rem]" strokeWidth={2} />
        </button>

        <div className="fixed right-2 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex max-w-[calc(100vw-4.75rem)] origin-top-right scale-[0.92] items-center gap-1.5 rounded-full border border-gray-200/90 bg-white/95 px-1.5 py-1 shadow-lg backdrop-blur-md dark:border-transparent dark:bg-[#1f1f1f]/95 max-lg:max-w-[calc(100vw-4.25rem)] sm:right-3 sm:top-3 sm:gap-2 sm:px-2 sm:py-1.5 md:right-6 md:top-4 md:gap-3 md:px-3 md:py-2 lg:max-w-none lg:scale-100">
            <ThemeToggle />
            {!isAuthenticated ? (
                <button
                    className="cursor-pointer rounded-full px-4 py-2 text-xs font-semibold text-white transition-all duration-150 hover:brightness-110 hover:-translate-y-[1px] active:translate-y-0 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE2C55]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#1f1f1f] sm:px-6 sm:text-sm"
                    style={{ backgroundColor: "#f6339a" }}
                    onClick={() => {
                      setDropdownOpen(false);
                      setAuthOpen(true);
                    }}
                >
                    Đăng nhập
                </button>
            ) : (
                <div className="relative min-w-0">
                  <button
                      type="button"
                      className="flex max-w-full cursor-pointer items-center gap-2 rounded-full px-1.5 py-1 text-gray-900 transition-colors hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-white dark:hover:bg-white/10 dark:active:bg-white/15 dark:focus-visible:ring-white/40 dark:focus-visible:ring-offset-[#1f1f1f] sm:gap-3 sm:px-2"
                      onClick={() => setDropdownOpen((v) => !v)}
                      aria-expanded={dropdownOpen}
                      aria-haspopup="menu"
                  >
                      {user.avatarUrl && (
                          <img
                              src={user.avatarUrl}
                              alt={user.username || ""}
                              className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/15 sm:h-9 sm:w-9"
                          />
                      )}
                      <span className="hidden max-w-[7rem] truncate font-semibold text-gray-900 dark:text-white sm:inline sm:max-w-[10rem] md:max-w-none">
                          {user.firstName || ""} {user.lastName || user.username}
                      </span>
                  </button>

                  <TopbarDropdown
                    open={dropdownOpen}
                    onClose={() => setDropdownOpen(false)}
                    onViewProfile={() => {
                      setDropdownOpen(false);
                      navigate("/");
                    }}
                    onLogout={async () => {
                      setDropdownOpen(false);
                      await authApi.logout();
                      setUser(null);
                      navigate("/");
                    }}
                  />
                </div>
            )}
        </div>

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