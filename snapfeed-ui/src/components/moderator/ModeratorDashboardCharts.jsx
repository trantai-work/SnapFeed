import { useMemo, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { reportsApi } from "../../api";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

const UI_CONFIG = {
  uploads: {
    title: "Video Đăng Tải",
    subtitle: "Số lượng video mới tải lên hệ thống",
    color: "#6366f1",
    gradId: "indigoGrad",
    suffix: "video",
  },
  views: {
    title: "Lượt Xem",
    subtitle: "Tổng lượt xem video trên toàn hệ thống",
    color: "#10b981",
    gradId: "emeraldGrad",
    suffix: "lượt xem",
  },
  reports: {
    title: "Báo Cáo Vi Phạm",
    subtitle: "Số lượng báo cáo nhận được từ người dùng",
    color: "#f43f5e",
    gradId: "roseGrad",
    suffix: "báo cáo",
  }
};

export default function ModeratorDashboardCharts() {
  const [activeTab, setActiveTab] = useState("uploads");
  const [timeRange, setTimeRange] = useState("week");
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  const timeRangeOptions = useMemo(() => {
    return [
      { value: "week", label: "Ngày trong tuần" },
      { value: "month", label: "Ngày trong tháng" },
      { value: "year", label: "Theo tháng" },
      { value: "years", label: "Theo năm" },
    ];
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    reportsApi.getSystemStats(timeRange).then((data) => {
      if (alive) {
        setChartData(data);
        setLoading(false);
      }
    }).catch(console.error);
    return () => { alive = false; };
  }, [timeRange]);

  if (!chartData) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#777169]" />
      </div>
    );
  }

  const currentData = chartData[activeTab];
  const currentConfig = UI_CONFIG[activeTab];
  
  if (!currentData || !currentConfig) return null;
  
  const maxValue = Math.max(...currentData.values) * 1.15 || 100;

  // SVG dimensions
  const width = 800;
  const height = 360;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const numCols = currentData.values.length;
  // Dynamic bar width based on number of columns
  const barWidth = numCols > 0 ? Math.min(48, (chartWidth / numCols) * 0.6) : 0;

  const points = currentData.values.map((val, idx) => {
    // Center the bars horizontally
    const x = paddingLeft + (idx + 0.5) * (chartWidth / (numCols || 1));
    const h = (val / maxValue) * chartHeight;
    const y = paddingTop + chartHeight - h;
    return {
      x,
      y,
      h,
      value: val,
      date: currentData.dates[idx],
      growth: currentData.columnGrowths?.[idx] || "--",
      isNegativeGrowth: (currentData.columnGrowths?.[idx] || "").startsWith("-"),
    };
  });

  const gridLines = [];
  const count = 3;
  for (let i = 0; i <= count; i++) {
    const ratio = i / count;
    const y = paddingTop + chartHeight * ratio;
    const valueLabel = Math.round(maxValue * (1 - ratio));
    gridLines.push({ y, label: valueLabel.toLocaleString() });
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-1 text-left relative">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-3xl">
          <Loader2 className="h-8 w-8 animate-spin text-[#292524]" />
        </div>
      )}
      
      {/* 1. Header Section */}
      <div className="flex items-center justify-between border-b border-[#e7e5e4] pb-4">
        <div>
          <h2 className="font-['Times_New_Roman',serif] text-3xl font-light tracking-[-0.2px] text-[#0c0a09]">
            Tổng Quan Hệ Thống
          </h2>
          <p className="mt-1 text-xs text-[#777169]">
            Theo dõi hiệu suất kiểm duyệt, lưu lượng tải video và lượt tương tác.
          </p>
        </div>
      </div>

      {/* 2. Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Object.keys(UI_CONFIG).map((key) => {
          const isActive = activeTab === key;
          const config = UI_CONFIG[key];
          const data = chartData[key] || { totalValue: 0, growth: "+0%", isNegative: false };
          
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setActiveTab(key);
                setHoveredIndex(null);
              }}
              className={classNames(
                "group flex cursor-pointer flex-col rounded-2xl border p-4 text-left transition-all duration-300",
                isActive
                  ? "border-[#292524] bg-[#fafafa] shadow-[0_4px_16px_rgba(0,0,0,0.03)] scale-[1.01]"
                  : "border-[#e7e5e4] bg-white hover:border-[#a8a29e] hover:shadow-[0_2px_10px_rgba(0,0,0,0.01)]"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.96px] text-[#777169]">
                  {config.title}
                </span>
                <span
                  className={classNames(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold transition-all",
                    data.isNegative ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                  )}
                >
                  {data.growth}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-['Times_New_Roman',serif] text-3xl font-light text-[#0c0a09] transition-all">
                  {data.totalValue}
                </span>
                <span className="text-[10px] font-medium text-[#777169]">
                  tích lũy
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Main Chart */}
      <div className="flex flex-col justify-between rounded-3xl border border-[#e7e5e4] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
        
        {/* Header area inside Chart Card with Time Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: currentConfig.color }}
              />
              <span className="text-sm font-bold text-[#0c0a09]">{currentConfig.title}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#777169]">{currentConfig.subtitle}</p>
          </div>

          {/* Time range selector pills */}
          <div className="flex flex-wrap gap-1 rounded-full bg-[#f0efed] p-1 self-start sm:self-center">
            {timeRangeOptions.map((opt) => {
              const active = timeRange === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setTimeRange(opt.value);
                    setHoveredIndex(null);
                  }}
                  className={classNames(
                    "cursor-pointer rounded-full px-3 py-1 text-[11px] font-semibold transition",
                    active
                      ? "bg-white text-[#0c0a09] shadow-sm"
                      : "text-[#777169] hover:text-[#0c0a09]"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart Plot Screen */}
        <div className="relative overflow-hidden rounded-2xl border border-[#f0efed] bg-[#fafafa] p-3">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
          >
            <defs>
              <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {gridLines.map((line, idx) => (
              <g key={idx} className="opacity-30">
                <line
                  x1={paddingLeft}
                  y1={line.y}
                  x2={width - paddingRight}
                  y2={line.y}
                  stroke="#d6d3d1"
                  strokeWidth={0.75}
                  strokeDasharray={idx === gridLines.length - 1 ? "" : "3 3"}
                />
                <text
                  x={paddingLeft - 8}
                  y={line.y + 3.5}
                  textAnchor="end"
                  fill="#777169"
                  fontSize={9}
                  fontWeight="600"
                >
                  {line.label}
                </text>
              </g>
            ))}

            {/* Bars */}
            {points.map((p, idx) => {
              const isHovered = hoveredIndex === idx;
              return (
                <g
                  key={idx}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Invisible hit area for easier hovering */}
                  <rect
                    x={p.x - chartWidth / (numCols * 2)}
                    y={paddingTop}
                    width={chartWidth / numCols}
                    height={chartHeight}
                    fill="transparent"
                  />
                  
                  {/* The visible Bar */}
                  <rect
                    x={p.x - barWidth / 2}
                    y={p.y}
                    width={barWidth}
                    height={Math.max(p.h, 4)}
                    rx={4}
                    fill={currentConfig.color}
                    opacity={isHovered ? 1 : 0.6}
                    className="transition-all duration-300"
                  />

                  {/* Growth % on top of the bar */}
                  {p.growth !== "--" && p.growth !== "0%" && p.growth !== "+0%" && (
                    <text
                      x={p.x}
                      y={isHovered ? p.y - 22 : p.y - 8}
                      textAnchor="middle"
                      fill={p.isNegativeGrowth ? "#f43f5e" : "#10b981"}
                      fontSize={9}
                      fontWeight="bold"
                      className="pointer-events-none transition-all duration-300"
                      opacity={isHovered ? 0 : 1}
                    >
                      {p.growth}
                    </text>
                  )}

                  {/* Value on top of the bar if hovered */}
                  {isHovered && (
                    <text
                      x={p.x}
                      y={p.y - 8}
                      textAnchor="middle"
                      fill={currentConfig.color}
                      fontSize={11}
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {p.value}
                    </text>
                  )}

                  {/* X-axis Label */}
                  <text
                    x={p.x}
                    y={paddingTop + chartHeight + 20}
                    textAnchor="middle"
                    fill={isHovered ? "#0c0a09" : "#a8a29e"}
                    fontSize={10}
                    fontWeight={isHovered ? "bold" : "400"}
                    className="pointer-events-none transition-colors"
                  >
                    {timeRange === "month" 
                      ? (idx === 0 ? p.date : parseInt(p.date.split("/")[0], 10)) 
                      : p.date}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Floating Tooltip Box */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <div
              className="absolute pointer-events-none rounded-xl border border-[#e7e5e4] bg-white/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md transition-all duration-150 z-50 flex flex-col gap-1 min-w-[120px]"
              style={{
                left: `${(points[hoveredIndex].x / width) * 100}%`,
                top: `${((points[hoveredIndex].y - 20) / height) * 100}%`,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="flex items-center justify-between gap-4 border-b border-[#f0efed] pb-1">
                <span className="font-bold text-[#777169]">{points[hoveredIndex].date}</span>
                <span
                  className={classNames(
                    "rounded px-1.5 py-0.5 text-[10px] font-bold",
                    points[hoveredIndex].isNegativeGrowth ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                  )}
                >
                  {points[hoveredIndex].growth}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[10px] text-[#a8a29e] uppercase font-bold tracking-wider">Giá trị</span>
                <span className="text-sm font-black text-[#0c0a09]">
                  {points[hoveredIndex].value.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
