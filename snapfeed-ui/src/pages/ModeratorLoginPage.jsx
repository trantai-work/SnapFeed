import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ShieldCheck, User, Lock } from "lucide-react";
import { authApi } from "../api";
import { useAuth } from "../context/AuthContext";
import { useMessageBox } from "../components/MessageBox";
import logoLightMode from "../assets/logo_light_mode.png";

function canModerate(user) {
  return Boolean(user?.isModerator || user?.isAdmin || user?.is_moderator || user?.is_admin);
}

export default function ModeratorLoginPage() {
  const navigate = useNavigate();
  const { user, loading, refreshUser, setUser } = useAuth();
  const { show } = useMessageBox();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return username.trim() && password && !submitting;
  }, [password, submitting, username]);

  if (!loading && canModerate(user)) {
    return <Navigate to="/moderator" replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const loggedInUser = await authApi.login({
        username: username.trim(),
        password,
      });
      const freshUser = await refreshUser();
      const nextUser = freshUser || loggedInUser;

      if (!canModerate(nextUser)) {
        await authApi.logout().catch(() => { });
        setUser(null);
        show({
          status: "error",
          title: "Không có quyền kiểm duyệt",
          message: "Tài khoản này không thuộc nhóm Người kiểm duyệt.",
        });
        return;
      }

      setUser(nextUser);
      navigate("/moderator", { replace: true });
    } catch (err) {
      show({
        status: "error",
        title: "Đăng nhập thất bại",
        message: err?.message || "Vui lòng kiểm tra lại tài khoản và mật khẩu.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#09090b] px-4 py-10 font-sans text-white">
      {/* Background Neon Glows */}
      <div className="absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-pink-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute -right-20 -bottom-20 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[350px] rounded-full bg-fuchsia-500/5 blur-[100px] pointer-events-none" />

      {/* Cyber Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
          backgroundSize: "24px 24px"
        }}
      />

      <div className="relative w-full max-w-[420px] overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl p-8 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.5)]">
        
        {/* Brand logo & security indicator */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-6 bg-white/5 p-3 rounded-2xl border border-white/10 shadow-inner group">
            <ShieldCheck className="h-8 w-8 text-pink-500 animate-pulse group-hover:scale-105 transition-transform" strokeWidth={1.8} />
          </div>
          <span className="text-[10px] font-bold tracking-[0.2em] text-pink-500 uppercase mb-2">
            Safety Control Center
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            SnapFeed Control Panel
          </h1>
          <p className="mt-1.5 text-xs text-zinc-400">
            Dành cho Người kiểm duyệt nội dung hệ thống.
          </p>
        </div>

        <form className="space-y-5" onSubmit={submit}>
          
          {/* Username Input */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Tên đăng nhập
            </label>
            <div className="relative group">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-pink-500 transition-colors">
                <User size={16} />
              </span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="h-11 w-full rounded-xl border border-white/10 bg-zinc-950/50 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/10"
                placeholder="Nhập tài khoản Admin/Mod..."
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Mật khẩu
            </label>
            <div className="relative group">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-pink-500 transition-colors">
                <Lock size={16} />
              </span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="h-11 w-full rounded-xl border border-white/10 bg-zinc-950/50 pl-10 pr-12 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/10"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-zinc-500 transition hover:bg-white/5 hover:text-white"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="relative w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-5 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition-all duration-300 hover:shadow-pink-500/40 hover:scale-[1.01] active:scale-[0.99] disabled:scale-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <span>Đăng nhập hệ thống</span>
            )}
          </button>
        </form>

        {/* Footer copyright */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-zinc-500 font-semibold tracking-wider">
            &copy; {new Date().getFullYear()} SNAPFEED SECURITY SYSTEM
          </p>
        </div>
      </div>
    </div>
  );
}
