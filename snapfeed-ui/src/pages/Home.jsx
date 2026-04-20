import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "../components/Sidebar";
import SimpleSideBar from "../components/SimpleSideBar";

export default function Home() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { pathname } = useLocation();
  const isChatPage = pathname.startsWith("/chats");

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-white text-gray-900 transition-colors dark:bg-black dark:text-white">
      {isChatPage ? (
        <>
          {/* Desktop chat nav */}
          <div className="hidden md:block">
            <SimpleSideBar />
          </div>
          {/* Mobile chat nav uses the full Sidebar (drawer) */}
          <div className="md:hidden">
            <Sidebar
              mobileOpen={mobileNavOpen}
              onMobileClose={() => setMobileNavOpen(false)}
            />
          </div>
        </>
      ) : (
        <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      )}

      <div
        className={
          isChatPage
            ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0"
            : "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden max-lg:p-0 lg:p-6 lg:pt-6"
        }
      >
        {!isChatPage ? (
          <button
            type="button"
            className="fixed left-2 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200/90 bg-white/95 text-gray-800 shadow-md backdrop-blur-md transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-[#1f1f1f]/95 dark:text-white dark:hover:bg-white/10 sm:left-3 sm:top-3 sm:h-11 sm:w-11 lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Mở menu"
          >
            <Menu
              className="h-[1.15rem] w-[1.15rem] sm:h-[1.35rem] sm:w-[1.35rem]"
              strokeWidth={2}
            />
          </button>
        ) : null}

        {isChatPage ? (
          <div className="flex items-center gap-3 border-b border-gray-200 bg-white/80 px-3 py-3 backdrop-blur-md dark:border-white/10 dark:bg-black/40 md:hidden">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-2xl hover:bg-black/5 active:bg-black/10 dark:hover:bg-white/10 dark:active:bg-white/15"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Mở menu"
            >
              <Menu className="h-5 w-5" strokeWidth={2} />
            </button>
            <div className="text-base font-bold">Tin nhắn</div>
          </div>
        ) : null}

        <Outlet />
      </div>

      {/* Chat mobile nav uses Sidebar drawer (no extra overlay needed here) */}
    </div>
  );
}