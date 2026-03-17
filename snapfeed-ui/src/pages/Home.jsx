import Sidebar from "../components/Sidebar"
import TopbarAction from "../components/TopbarAction"

export default function Home() {
  return (
    <div className="flex bg-black min-h-screen text-white">

      {/* Sidebar */}
      <Sidebar />

      {/* Feed */}
      <div className="flex-1 p-6">
     
      </div>
      {/* Top Right Actions */}
      <TopbarAction />

    </div>
  )
}