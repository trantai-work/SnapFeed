import { useState, useEffect, useRef } from "react";
import { Search, Loader2, UserRound, Shield, AlertTriangle, CheckCircle, Ban, RefreshCw } from "lucide-react";
import { usersApi } from "../../api";
import { useMessageBox } from "../MessageBox";
import { classNames } from "./moderatorHelpers";

export default function UsersManagement() {
  const { show } = useMessageBox();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [togglingId, setTogglingId] = useState(null);

  const searchTimer = useRef(null);

  const loadUsers = async (currentPage = page, query = searchQuery) => {
    setLoading(true);
    try {
      const data = await usersApi.listModeratorUsers({
        page: currentPage,
        pageSize: 15,
        q: query,
      });
      setUsers(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      show({
        status: "error",
        title: "Lỗi tải danh sách",
        message: err?.message || "Không thể lấy danh sách người dùng.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Search trigger with debounce
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    searchTimer.current = setTimeout(() => {
      setPage(1);
      loadUsers(1, searchQuery);
    }, 450);

    return () => clearTimeout(searchTimer.current);
  }, [searchQuery]);

  // Page change trigger
  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadUsers(newPage, searchQuery);
  };

  const handleToggleActive = async (targetUser) => {
    const isActive = targetUser.isActive ?? targetUser.is_active;
    const actionText = isActive ? "Khóa" : "Mở khóa";

    setTogglingId(targetUser.id);
    try {
      const res = await usersApi.toggleUserActiveStatus(targetUser.id);
      const updatedActive = res.data?.isActive ?? res.data?.is_active ?? !isActive;
      
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, isActive: updatedActive, is_active: updatedActive } : u))
      );

      show({
        status: "success",
        title: `Đã ${actionText.toLowerCase()} tài khoản`,
        message: `Tài khoản @${targetUser.username} hiện đã ${updatedActive ? "hoạt động trở lại" : "bị khóa"}.`,
      });
    } catch (err) {
      show({
        status: "error",
        title: "Thao tác thất bại",
        message: err?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / 15) || 1;

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-[#e7e5e4] shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden text-left">
      {/* Header Section */}
      <div className="flex flex-col justify-between gap-4 p-6 border-b border-[#e7e5e4] sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f0efed] text-[#292524]">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0c0a09]">Quản lý người dùng</h2>
            <p className="text-xs text-[#777169]">Xem, tìm kiếm thông tin và quản lý trạng thái tài khoản người dùng</p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadUsers(page, searchQuery)}
            disabled={loading}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#d6d3d1] bg-white transition hover:bg-[#f0efed] disabled:opacity-50"
            title="Làm mới"
          >
            <RefreshCw className={classNames("h-4 w-4 text-[#292524]", loading ? "animate-spin" : "")} />
          </button>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8a29e]" />
            <input
              type="text"
              placeholder="Tìm theo username, tên, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-full border border-[#d6d3d1] bg-white pl-10 pr-10 text-sm font-medium text-[#0c0a09] placeholder-[#a8a29e] outline-none transition focus:border-[#292524] focus:ring-1 focus:ring-[#292524]"
            />
            {loading && searchQuery && (
              <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#a8a29e]" />
            )}
          </div>
        </div>
      </div>

      {/* Main Content (Table) */}
      <div className="flex-1 overflow-x-auto min-h-0">
        {loading && users.length === 0 ? (
          <div className="flex h-full min-h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#292524]" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center p-8">
            <UserRound className="h-12 w-12 text-[#a8a29e]" />
            <h3 className="mt-4 text-base font-bold text-[#0c0a09]">Không tìm thấy người dùng</h3>
            <p className="mt-1 text-sm text-[#777169]">Hãy thử đổi từ khóa tìm kiếm khác.</p>
          </div>
        ) : (
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#e7e5e4] bg-[#fafafa] text-xs font-semibold uppercase tracking-wider text-[#777169]">
                <th className="py-4 px-6">Người dùng</th>
                <th className="py-4 px-6">Ngày tham gia</th>
                <th className="py-4 px-6">Vai trò</th>
                <th className="py-4 px-6">Trạng thái</th>
                <th className="py-4 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7e5e4] text-sm text-[#0c0a09]">
              {users.map((u) => {
                const isToggling = togglingId === u.id;
                const displayName = [u.firstName, u.lastName].filter(Boolean).join(" ") || `@${u.username}`;
                const dateJoined = u.dateJoined || u.date_joined;
                const isActive = u.isActive ?? u.is_active;

                return (
                  <tr key={u.id} className="hover:bg-[#fafafa]/50 transition duration-150">
                    {/* User Profile column */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#f0efed] text-[#777169] ring-1 ring-black/5">
                          {u.avatarUrl || u.avatar_url ? (
                            <img
                              src={u.avatarUrl || u.avatar_url}
                              alt=""
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-xs font-bold text-[#4e4e4e]">
                              {u.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[#0c0a09] truncate">{displayName}</div>
                          <div className="text-xs text-[#777169] truncate">@{u.username}</div>
                        </div>
                      </div>
                    </td>

                    {/* Date Joined column */}
                    <td className="py-4 px-6 text-[#777169] text-xs">
                      {dateJoined ? new Date(dateJoined).toLocaleDateString("vi-VN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }) : "—"}
                    </td>

                    {/* Role column */}
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1">
                        {u.isAdmin || u.is_admin ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            <Shield className="h-3 w-3" /> Admin
                          </span>
                        ) : u.isModerator || u.is_moderator ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                            <Shield className="h-3 w-3" /> Mod
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                            User
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status column */}
                    <td className="py-4 px-6">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircle className="h-3 w-3" /> Đang hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                          <AlertTriangle className="h-3 w-3" /> Đã khóa
                        </span>
                      )}
                    </td>

                    {/* Action buttons column */}
                    <td className="py-4 px-6 text-right">
                      {u.isAdmin || u.is_admin ? (
                        <span className="text-xs text-gray-400 italic">Hệ thống</span>
                      ) : (
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggleActive(u)}
                          className={classNames(
                            "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition border shadow-sm disabled:opacity-50",
                            isActive
                              ? "bg-white border-[#d6d3d1] text-red-600 hover:bg-red-50 hover:border-red-200"
                              : "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700"
                          )}
                        >
                          {isToggling ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isActive ? (
                            <>
                              <Ban className="h-3.5 w-3.5" />
                              Khóa
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3.5 w-3.5" />
                              Mở khóa
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#e7e5e4] px-6 py-4 bg-[#fafafa]">
          <div className="text-xs text-[#777169]">
            Hiển thị trang <span className="font-bold text-[#0c0a09]">{page}</span> / {totalPages} (Tổng số {totalCount} người dùng)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1 || loading}
              className="inline-flex h-9 items-center justify-center rounded-full border border-[#d6d3d1] bg-white px-4 text-xs font-semibold text-[#292524] transition hover:bg-[#f0efed] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Trước
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages || loading}
              className="inline-flex h-9 items-center justify-center rounded-full border border-[#d6d3d1] bg-white px-4 text-xs font-semibold text-[#292524] transition hover:bg-[#f0efed] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
