import { useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Home as HomeIcon,
  Send,
  MessageSquare,
  Upload,
  User,
  Search
} from "lucide-react";

import logo from "../assets/logo.png";
import AuthModal from "./AuthModal";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/auth.service";

export default function Sidebar() {
  const { isAuthenticated, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const recentProvider = useMemo(() => {
    return window.localStorage.getItem("auth_recent_provider") || null;
  }, []);

  const menu = [
    { icon: HomeIcon, label: "Đề xuất", path: "/", public: true },
    { icon: Send, label: "Tin nhắn", path: "chats" },
    { icon: MessageSquare, label: "Thông báo", path: "notifications" },
    { icon: Upload, label: "Tải lên", path: "upload" },
    { icon: User, label: "Hồ sơ", path: "profile" },
  ];

  if (loading) return null;

  return (
    <>
      <div className="w-64 h-screen bg-black text-white p-4 flex flex-col">
        
        {/* Logo */}
        <div className="flex items-center gap-2 mb-4">
          <img src={logo} alt="logo" className="h-28 w-auto object-contain" />
        </div>

        {/* Search */}
        <div className="flex items-center bg-gray-800 rounded-full px-4 py-2 mb-4">
          <Search size={16} className="text-gray-400" />
          <input
            placeholder="Tìm kiếm"
            className="bg-transparent outline-none ml-2 text-sm w-full"
          />
        </div>

        {/* Menu */}
        <div className="space-y-1">
          {menu.map((item, index) => {
            const Icon = item.icon;
            const requiresAuth = !item.public;
            return (
              <NavLink
                key={index}
                to={item.path}
                onClick={(e) => {
                  if (!isAuthenticated && requiresAuth) {
                    e.preventDefault();
                    setAuthOpen(true);
                  }
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800
                  ${isActive ? "text-pink-500 font-semibold" : ""}`
                }
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-auto text-gray-500 text-sm space-y-2 pt-6 border-t border-gray-800">
          <Link
            to="/privacy"
            className="block text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Chính sách quyền riêng tư
          </Link>
          <div className="pt-2 text-xs">
            © 2026 SnapFeed
          </div>
        </div>
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