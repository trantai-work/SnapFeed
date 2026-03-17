import {
    Home,
    Compass,
    Send,
    MessageSquare,
    Upload,
    User,
    Search
  } from "lucide-react"

import logo from "../assets/logo.png"
  
  export default function Sidebar() {
    const menu = [
      { icon: Home, label: "Đề xuất", active: true },
      { icon: Send, label: "Tin nhắn" },
      { icon: MessageSquare, label: "Thông báo" },
      { icon: Upload, label: "Tải lên" },
      { icon: User, label: "Hồ sơ" },
    ]
  
    return (
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
            const Icon = item.icon
  
            return (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-800
                  ${item.active ? "text-pink-500 font-semibold" : ""}
                `}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </div>
            )
          })}
  
        </div>
  
        {/* Footer */}
        <div className="mt-auto text-gray-500 text-sm space-y-2 pt-6 border-t border-gray-800">
          <div className="pt-2 text-xs">
            © 2026 SnapFeed
          </div>
  
        </div>
  
      </div>
    )
  }