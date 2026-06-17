import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Sparkles, ChevronRight, AlertCircle } from "lucide-react";
import { recommendationApi } from "../../api";
import { classNames } from "./moderatorHelpers";

const COLOR_PALETTE = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Violet
  "#14b8a6", // Teal
  "#f43f5e", // Rose
  "#06b6d4", // Cyan
  "#a855f7", // Purple
];

export default function UserPreferences() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [prefLoading, setPrefLoading] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const searchTimer = useRef(null);

  // Handle live search with debouncing
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const users = await recommendationApi.searchUsers(query);
        setSearchResults(users || []);
      } catch (err) {
        console.error("Search users failed:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(searchTimer.current);
  }, [searchQuery]);

  // Load preferences when a user is selected
  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setSearchQuery("");
    setSearchResults([]);
    setPrefLoading(true);
    setPreferences(null);

    try {
      const data = await recommendationApi.getUserPreferences(user.id);
      setPreferences(data);
    } catch (err) {
      console.error("Load user preferences failed:", err);
    } finally {
      setPrefLoading(false);
    }
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Donut chart calculations
  const tags = preferences?.tags || [];
  const totalTop10Count = tags.reduce((sum, tag) => sum + (tag.count || 0), 0);
  const circumference = 2 * Math.PI * 35; // radius = 35 -> circumference ≈ 219.91148
  
  let cumulativePercent = 0;
  const donutSegments = tags.map((tag, idx) => {
    const relativeFraction = totalTop10Count > 0 ? (tag.count || 0) / totalTop10Count : 0;
    const relativePercentage = relativeFraction * 100;
    
    const strokeLength = (relativePercentage * circumference) / 100;
    const strokeOffset = - (cumulativePercent * circumference) / 100;
    
    cumulativePercent += relativePercentage;
    
    return {
      ...tag,
      relativePercentage,
      percentage: Math.round(relativePercentage * 10) / 10,
      strokeLength,
      strokeOffset,
      color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
    };
  });

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-[#e7e5e4] shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden text-left">
      {/* 1. Header Section */}
      <div className="flex flex-col justify-between gap-4 p-6 border-b border-[#e7e5e4] sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f0efed] text-[#292524]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0c0a09]">Phân tích sở thích gợi ý</h2>
            <p className="text-xs text-[#777169]">Trực quan hóa vector sở thích người dùng thu được từ mô hình AI (VideoMAE)</p>
          </div>
        </div>

        {/* Search Input Box */}
        <div className="relative w-full sm:w-80">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8a29e]" />
            <input
              type="text"
              placeholder="Tìm theo username, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-full border border-[#d6d3d1] bg-white pl-10 pr-10 text-sm font-medium text-[#0c0a09] placeholder-[#a8a29e] outline-none transition focus:border-[#292524] focus:ring-1 focus:ring-[#292524]"
            />
            {searchLoading && (
              <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#a8a29e]" />
            )}
          </div>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 z-50 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-[#e7e5e4] bg-white p-2 shadow-2xl">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectUser(u)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-[#f5f5f5] cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* User Avatar */}
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#f0efed] text-[#777169]">
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-xs font-bold text-[#4e4e4e]">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#0c0a09]">
                        {u.firstName || u.lastName ? `${u.firstName} ${u.lastName}` : `@${u.username}`}
                      </div>
                      <div className="truncate text-xs text-[#777169]">@{u.username} • {u.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={classNames(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        u.hasEmbedding ? "bg-emerald-50 text-emerald-600" : "bg-[#f0efed] text-[#777169]"
                      )}
                    >
                      {u.hasEmbedding ? "Có Vector" : "Trống"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#a8a29e]" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Selected User Indicator Bar */}
      {selectedUser && (
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#e7e5e4] bg-[#fafafa]">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-semibold text-zinc-500">Đang xem:</span>
            <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-[#f0efed] text-[#777169]">
              {selectedUser.avatarUrl ? (
                <img
                  src={selectedUser.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-[10px] font-bold text-[#4e4e4e]">
                  {selectedUser.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="font-bold text-[#0c0a09]">
              {selectedUser.firstName || selectedUser.lastName
                ? `${selectedUser.firstName} ${selectedUser.lastName}`
                : `@${selectedUser.username}`}
            </span>
            <span className="text-zinc-400">({selectedUser.email || `@${selectedUser.username}`})</span>
          </div>
          <button
            onClick={() => {
              setSelectedUser(null);
              setPreferences(null);
            }}
            className="text-xs text-red-500 hover:text-red-700 font-bold transition cursor-pointer"
          >
            Đóng phân tích
          </button>
        </div>
      )}

      {/* 3. Main Content Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {prefLoading ? (
          <div className="flex min-h-[400px] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#292524]" />
          </div>
        ) : selectedUser ? (
          !preferences?.hasEmbedding ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center text-center">
              <AlertCircle className="h-10 w-10 text-[#a8a29e]" />
              <h3 className="mt-4 text-lg font-bold text-[#0c0a09]">Chưa có dữ liệu hành vi</h3>
              <p className="mt-2 max-w-sm text-sm text-[#777169] leading-relaxed">
                Người dùng này chưa có hoạt động xem hoặc tương tác với video nào. Hệ thống gợi ý chưa thể xây dựng vector sở thích.
              </p>
            </div>
          ) : tags.length === 0 ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center text-center">
              <AlertCircle className="h-10 w-10 text-[#a8a29e]" />
              <h3 className="mt-4 text-lg font-bold text-[#0c0a09]">Không có tag thống kê</h3>
              <p className="mt-2 max-w-sm text-sm text-[#777169] leading-relaxed">
                Đã tìm thấy các video tương đồng nhất nhưng các video này không chứa bất kỳ thẻ phân loại (tag) nào để dịch sở thích.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.2fr_1.8fr]">
              {/* Left Column: Donut Chart Display */}
              <div className="flex flex-col justify-between rounded-3xl border border-[#e7e5e4] bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
                <div>
                  <h3 className="text-sm font-bold text-[#0c0a09] uppercase tracking-wider">Phân Phối Chủ Đề</h3>
                  <p className="text-[10px] text-[#777169]">Tỉ lệ % tương quan sở thích</p>
                </div>

                <div
                  className="relative my-8 flex items-center justify-center"
                  onMouseMove={handleMouseMove}
                >
                  <svg
                    width="220"
                    height="220"
                    viewBox="0 0 160 160"
                    className="transform -rotate-90 overflow-visible"
                  >
                    {donutSegments.map((segment, idx) => {
                      const isHovered = hoveredIndex === idx;
                      return (
                        <circle
                          key={idx}
                          cx="80"
                          cy="80"
                          r="35"
                          fill="transparent"
                          stroke={segment.color}
                          strokeWidth={isHovered ? "74" : "70"}
                          strokeDasharray={`${segment.strokeLength} ${circumference}`}
                          strokeDashoffset={segment.strokeOffset}
                          pointerEvents="stroke"
                          onMouseEnter={() => setHoveredIndex(idx)}
                          onMouseLeave={() => setHoveredIndex(null)}
                          className="transition-all duration-300 cursor-pointer"
                          style={{ transformOrigin: "center" }}
                        />
                      );
                    })}
                  </svg>

                  {hoveredIndex !== null && donutSegments[hoveredIndex] && (
                    <div
                      className="absolute z-50 pointer-events-none bg-white/95 backdrop-blur-md border border-[#e7e5e4] rounded-2xl p-3 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)] text-xs flex flex-col gap-1 text-left min-w-[125px]"
                      style={{
                        left: mousePos.x + 12,
                        top: mousePos.y + 12,
                      }}
                    >
                      <div className="font-bold text-[#0c0a09] flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: donutSegments[hoveredIndex].color }}
                        />
                        #{donutSegments[hoveredIndex].name}
                      </div>
                      <div className="text-[#777169] text-[10px] mt-1">
                        Tần suất: <span className="font-semibold text-[#0c0a09]">{donutSegments[hoveredIndex].count} lần</span>
                      </div>
                      <div className="text-[#777169] text-[10px]">
                        Tỉ lệ: <span className="font-bold text-[#0c0a09]">{donutSegments[hoveredIndex].percentage}%</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 justify-center border-t border-[#f0efed] pt-4">
                  {donutSegments.slice(0, 5).map((segment, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 text-[10px] font-semibold text-[#57534e]"
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                      <span>#{segment.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Tag list and progress bars */}
              <div className="rounded-3xl border border-[#e7e5e4] bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#0c0a09] uppercase tracking-wider">Chi Tiết Tương Tác</h3>
                  <p className="text-[10px] text-[#777169]">Thống kê chi tiết tần suất xuất hiện và tỉ lệ</p>
                </div>

                <div className="mt-4 space-y-3.5 flex-1">
                  {donutSegments.map((segment, idx) => {
                    const isHovered = hoveredIndex === idx;
                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className={classNames(
                          "group rounded-xl p-2 transition duration-200",
                          isHovered ? "bg-[#fafafa]" : ""
                        )}
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-bold text-[#0c0a09] flex items-center gap-1.5">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: segment.color }}
                            />
                            #{segment.name}
                          </span>
                          <div className="flex items-center gap-2 text-[#777169] text-[10px] font-medium">
                            <span>Xuất hiện: {segment.count} lần</span>
                            <span>•</span>
                            <span className="font-bold text-[#0c0a09]">{segment.percentage}%</span>
                          </div>
                        </div>
                        
                        <div className="relative w-full bg-[#f0efed] h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${segment.percentage}%`,
                              backgroundColor: segment.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )
        ) : (
          /* Welcome state when no user is selected */
          <div className="flex min-h-[400px] flex-col items-center justify-center text-center p-8">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[#fafafa] border border-[#e7e5e4] text-[#a8a29e]">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="mt-5 font-['Times_New_Roman',serif] text-2xl font-light text-[#0c0a09]">
              Khám Phá Sở Thích Người Dùng
            </h3>
            <p className="mt-2 max-w-sm text-sm text-[#777169] leading-relaxed">
              Nhập tên người dùng vào ô tìm kiếm ở góc trên bên phải để bắt đầu xem phân tích mô hình gợi ý AI.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
