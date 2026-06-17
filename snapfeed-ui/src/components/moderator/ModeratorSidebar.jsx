import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Flag,
  Video,
  UserRound,
  LogOut,
  Headphones,
  Music,
  Sparkles,
} from "lucide-react";
import logoLightMode from "../../assets/logo_light_mode.png";

import { classNames } from "./moderatorHelpers";

export default function ModeratorSidebar({ user, reportsCount, supportCount, onLogout, activeTab, setActiveTab }) {
  const navigate = useNavigate();

  const displayName =
    [user?.firstName, user?.lastName]
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .join(" ") ||
    user?.username ||
    "Moderator";

  return (
    <aside className="hidden h-full w-72 shrink-0 border-r border-[#e7e5e4] bg-[#f5f5f5] px-5 py-5 lg:flex lg:flex-col">
      <button
        type="button"
        className="mb-8 flex cursor-pointer items-center"
        onClick={() => {
          if (window.location.pathname === "/") {
            window.location.reload();
          } else {
            navigate("/");
          }
        }}
        aria-label="Về SnapFeed"
      >
        <img src={logoLightMode} alt="SnapFeed" className="h-16 w-auto object-contain" />
      </button>

      <nav className="space-y-1">
        <button
          type="button"
          onClick={() => setActiveTab("dashboard")}
          className={classNames(
            "flex h-11 w-full cursor-pointer items-center gap-3 rounded-full px-4 text-sm font-medium transition",
            activeTab === "dashboard"
              ? "bg-[#292524] text-white"
              : "text-[#4e4e4e] hover:bg-[#f0efed] hover:text-[#0c0a09]"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={classNames(
            "flex h-11 w-full cursor-pointer items-center gap-3 rounded-full px-4 text-sm font-medium transition",
            activeTab === "reports"
              ? "bg-[#292524] text-white"
              : "text-[#4e4e4e] hover:bg-[#f0efed] hover:text-[#0c0a09]"
          )}
        >
          <Flag className="h-4 w-4" />
          Báo cáo
          <span
            className={classNames(
              "ml-auto rounded-full px-2 py-0.5 text-xs transition",
              activeTab === "reports"
                ? "bg-white/10 text-white"
                : "bg-[#f0efed] text-[#292524]"
            )}
          >
            {reportsCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("support")}
          className={classNames(
            "flex h-11 w-full cursor-pointer items-center gap-3 rounded-full px-4 text-sm font-medium transition",
            activeTab === "support"
              ? "bg-[#292524] text-white"
              : "text-[#4e4e4e] hover:bg-[#f0efed] hover:text-[#0c0a09]"
          )}
        >
          <Headphones className="h-4 w-4" />
          Hỗ trợ
          <span
            className={classNames(
              "ml-auto rounded-full px-2 py-0.5 text-xs transition",
              activeTab === "support"
                ? "bg-white/10 text-white"
                : "bg-[#f0efed] text-[#292524]"
            )}
          >
            {supportCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("music")}
          className={classNames(
            "flex h-11 w-full cursor-pointer items-center gap-3 rounded-full px-4 text-sm font-medium transition",
            activeTab === "music"
              ? "bg-[#292524] text-white"
              : "text-[#4e4e4e] hover:bg-[#f0efed] hover:text-[#0c0a09]"
          )}
        >
          <Music className="h-4 w-4" />
          Nhạc nền
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("preferences")}
          className={classNames(
            "flex h-11 w-full cursor-pointer items-center gap-3 rounded-full px-4 text-sm font-medium transition",
            activeTab === "preferences"
              ? "bg-[#292524] text-white"
              : "text-[#4e4e4e] hover:bg-[#f0efed] hover:text-[#0c0a09]"
          )}
        >
          <Sparkles className="h-4 w-4" />
          Sở thích gợi ý
        </button>
      </nav>

      <div className="mt-auto rounded-3xl border border-[#e7e5e4] bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f0efed] text-[#292524]">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-[#0c0a09]">{displayName}</div>
            <div className="truncate text-xs text-[#777169]">@{user?.username || "moderator"}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[#d6d3d1] bg-white px-4 text-[15px] font-medium text-[#292524] transition hover:bg-[#f0efed]"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
