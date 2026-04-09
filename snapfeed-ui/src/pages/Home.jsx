import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "../components/Sidebar";
import ThemeToggle from "../components/ThemeToggle";

export default function Home() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-white text-gray-900 transition-colors dark:bg-black dark:text-white">
      <Sidebar
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden max-lg:p-0 lg:p-6 lg:pt-6">
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

        <div className="fixed right-2 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex items-center justify-center rounded-full border border-gray-200/90 bg-white/95 px-2.5 py-2 shadow-lg backdrop-blur-md dark:border-transparent dark:bg-[#1f1f1f]/95 sm:right-3 sm:top-3 md:right-6 md:top-4 lg:right-10 lg:top-8">
          <ThemeToggle />
        </div>
        <Outlet />
      </div>
    </div>
  );
}