import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
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
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#f5f5f5] px-4 py-10 font-['Inter',system-ui,sans-serif] text-[#0c0a09]">
      <div className="pointer-events-none absolute -left-32 -top-28 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_30%_30%,#a7e5d3,transparent_34%),radial-gradient(circle_at_70%_30%,#f4c5a8,transparent_36%),radial-gradient(circle_at_50%_72%,#c8b8e0,transparent_40%)] opacity-80 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle_at_30%_34%,#e8b8c4,transparent_34%),radial-gradient(circle_at_70%_65%,#a8c8e8,transparent_38%)] opacity-60 blur-2xl" />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#e7e5e4] bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
        <img src={logoLightMode} alt="SnapFeed" className="mb-7 h-16 w-auto object-contain" />

        <div className="mb-7 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[#f0efed] text-[#0c0a09]">
            <ShieldCheck className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="font-['Times_New_Roman',serif] text-3xl font-light leading-tight tracking-[-0.32px]">Đăng nhập kiểm duyệt</h1>
            <p className="mt-1 text-sm leading-6 tracking-[0.15px] text-[#777169]">Dành cho Kiểm duyệt viên SnapFeed.</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#292524]">
              Tên đăng nhập
            </span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="h-11 w-full rounded-lg border border-[#d6d3d1] bg-white px-4 text-sm text-[#0c0a09] outline-none transition placeholder:text-[#a8a29e] focus:border-[#0c0a09] focus:ring-1 focus:ring-[#0c0a09]"
              placeholder="moderator"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#292524]">
              Mật khẩu
            </span>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="h-11 w-full rounded-lg border border-[#d6d3d1] bg-white px-4 pr-12 text-sm text-[#0c0a09] outline-none transition placeholder:text-[#a8a29e] focus:border-[#0c0a09] focus:ring-1 focus:ring-[#0c0a09]"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-[#777169] transition hover:bg-[#f0efed] hover:text-[#0c0a09]"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#292524] px-5 text-[15px] font-medium leading-none text-white transition hover:bg-[#0c0a09] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Đăng nhập
          </button>
        </form>
      </div>
    </div>
  );
}
