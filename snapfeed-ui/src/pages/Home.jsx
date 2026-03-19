import Sidebar from "../components/Sidebar"
import TopbarAction from "../components/Topbar/TopbarAction"
import { Outlet } from "react-router-dom";

export default function Home() {
  return (
    <div className="flex bg-black min-h-screen text-white">

      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 p-6">
        <Outlet />
      </div>
      {/* Top Right Actions */}
      <TopbarAction />

    </div>
  )
}