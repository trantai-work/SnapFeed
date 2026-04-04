import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopbarAction from "../components/Topbar/TopbarAction";

export default function Home() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-white text-gray-900 transition-colors dark:bg-black dark:text-white">
      <Sidebar
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col max-lg:max-h-[min(100svh,100dvh)] max-lg:overflow-x-hidden max-lg:overflow-y-hidden max-lg:p-0 lg:min-h-screen lg:max-h-none lg:overflow-visible lg:p-6 lg:pt-6">
        <Outlet />
      </div>

      <TopbarAction onOpenMobileNav={() => setMobileNavOpen(true)} />
    </div>
  );
}