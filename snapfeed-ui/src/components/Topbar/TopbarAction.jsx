import React, { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import AuthModal from "../AuthModal";
import TopbarDropdown from "./TopbarDropdown";
import { authApi } from "../../api";
import { authService } from "../../services/auth.service";

export default function TopbarAction() {
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
        <div className="fixed top-4 right-6 z-50 flex items-center bg-[#1f1f1f] px-4 py-2 rounded-full shadow-lg backdrop-blur-md">
            {!isAuthenticated ? (
                <button
                    className="cursor-pointer text-sm text-white px-6 py-2 rounded-full font-semibold transition-all duration-150 hover:brightness-110 hover:-translate-y-[1px] active:translate-y-0 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE2C55]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1f1f1f]"
                    style={{ backgroundColor: "#f6339a" }}
                    onClick={() => {
                      setDropdownOpen(false);
                      setAuthOpen(true);
                    }}
                >
                    Đăng nhập
                </button>
            ) : (
                <div className="relative">
                  <button
                      type="button"
                      className="cursor-pointer flex items-center gap-3 rounded-full px-2 py-1 transition-colors hover:bg-white/10 active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1f1f1f]"
                      onClick={() => setDropdownOpen((v) => !v)}
                      aria-expanded={dropdownOpen}
                      aria-haspopup="menu"
                  >
                      {user.avatarUrl && (
                          <img
                              src={user.avatarUrl}
                              alt={user.username || ""}
                              className="w-9 h-9 rounded-full object-cover ring-1 ring-white/15"
                          />
                      )}
                      <span className="font-semibold text-white">
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