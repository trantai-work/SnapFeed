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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth) * 2 - 1;
    const y = (clientY / innerHeight) * 2 - 1;
    setMousePos({ x, y });
  };

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
    <div
      onMouseMove={handleMouseMove}
      className="flex min-h-[100dvh] w-full flex-col md:flex-row bg-white dark:bg-[#09090b] font-sans antialiased overflow-hidden"
    >
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-15px, 20px) scale(1.05); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translate(0px, 0px) scale(1.05); }
          50% { transform: translate(20px, -15px) scale(1); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float-slow {
          animation: float-slow 12s ease-in-out infinite;
        }
        .animate-float-reverse {
          animation: float-reverse 15s ease-in-out infinite;
        }
        .animate-fade-in-up {
          opacity: 0;
          animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animation-delay-200 {
          animation-delay: 200ms;
        }
        .animation-delay-400 {
          animation-delay: 400ms;
        }
      `}</style>

      {/* Left Panel (Hidden on mobile) */}
      <div className="relative hidden md:flex w-[48%] shrink-0 flex-col justify-center px-16 text-white overflow-hidden bg-gradient-to-tr from-[#583bb7] via-[#6d4bc9] to-[#8d6ee5]">

        {/* Parallax Background Shapes (Moves slightly opposite to mouse) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${mousePos.x * -16}px, ${mousePos.y * -16}px)`,
            transition: 'transform 0.4s cubic-bezier(0.1, 0.8, 0.3, 1)'
          }}
        >
          {/* Concentric Wavy SVG Lines (Top-left) */}
          <svg
            className="absolute top-0 left-0 w-80 h-80 text-white/20 pointer-events-none animate-fade-in-up"
            viewBox="0 0 200 200"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          >
            <path d="M-40,80 C20,70 40,120 80,100 C120,80 110,40 80,-20 C50,-80 20,-60 -40,-40 Z" />
            <path d="M-50,100 C25,87 50,150 100,125 C150,100 137,50 100,-25 C62,-100 25,-75 -50,-50 Z" />
            <path d="M-60,120 C30,104 60,180 120,150 C180,120 164,60 120,-30 C76,-120 30,-90 -60,-60 Z" />
            <path d="M-70,140 C35,121 70,210 140,175 C210,140 191,70 140,-35 C89,-140 35,-105 -70,-70 Z" />
          </svg>

          {/* Concentric Wavy SVG Lines (Bottom-right) */}
          <svg
            className="absolute bottom-0 right-0 w-96 h-96 text-white/20 pointer-events-none animate-fade-in-up"
            viewBox="0 0 200 200"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          >
            <path d="M240,120 C180,130 160,80 120,100 C80,120 90,160 120,200 C150,240 180,220 240,210 Z" />
            <path d="M250,100 C175,113 150,50 100,75 C50,100 62,150 100,187 C138,225 175,200 250,187 Z" />
            <path d="M260,80 C170,96 140,20 80,50 C20,80 34,140 80,174 C126,209 170,180 260,164 Z" />
            <path d="M270,60 C165,79 130,-10 60,25 C-10,60 6,130 60,161 C114,193 165,160 270,141 Z" />
          </svg>

          {/* Scattered Accent Symbols */}
          <svg className="absolute top-[12%] left-[45%] w-6 h-6 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <svg className="absolute bottom-[28%] left-[28%] w-6 h-6 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>

          {/* Small circles */}
          <div className="absolute top-[28%] left-[62%] w-3 h-3 rounded-full border-2 border-white/30" />
          <div className="absolute bottom-[12%] left-[12%] w-3 h-3 rounded-full border-2 border-white/30" />

          {/* Dot Matrix (Top-right of Left Panel) */}
          <div className="absolute top-12 right-12 opacity-30">
            <svg width="40" height="72" viewBox="0 0 40 72" fill="none" xmlns="http://www.w3.org/2000/svg">
              {Array.from({ length: 6 }).map((_, r) => (
                <g key={r}>
                  {Array.from({ length: 4 }).map((_, c) => (
                    <circle key={c} cx={6 + c * 9} cy={6 + r * 12} r="1.5" fill="white" />
                  ))}
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Text Content */}
        <div className="relative z-10 max-w-md text-left select-none animate-fade-in-up animation-delay-200">
          <h2 className="text-4xl font-bold tracking-tight mb-3">SnapFeed Control Center</h2>
          <p className="text-base text-white/85 font-light leading-relaxed">
            Quản trị và kiểm duyệt nội dung video SnapFeed
          </p>
        </div>
      </div>

      {/* Right Panel (Form) */}
      <div className="relative flex flex-1 flex-col justify-center items-center px-8 py-16 bg-[#f8fafc] overflow-hidden">

        {/* Soft background glows wrapper (follows mouse) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${mousePos.x * 25}px, ${mousePos.y * 25}px)`,
            transition: 'transform 0.4s cubic-bezier(0.1, 0.8, 0.3, 1)'
          }}
        >
          <div className="absolute top-[10%] right-[10%] h-[280px] w-[280px] rounded-full bg-purple-200/25 blur-[90px] animate-float-slow" />
          <div className="absolute bottom-[10%] left-[10%] h-[280px] w-[280px] rounded-full bg-indigo-100/40 blur-[90px] animate-float-reverse" />
        </div>

        {/* Subtle grid pattern (pure CSS) */}
        <div
          className="absolute inset-0 opacity-[0.25] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #cbd5e1 1.2px, transparent 1.2px)`,
            backgroundSize: "20px 20px"
          }}
        />

        {/* Floating white form card with entrance animation and mouse tilt parallax */}
        <div
          className="relative w-full max-w-[390px] bg-white/90 backdrop-blur-md rounded-3xl p-8 border border-white/60 shadow-[0_20px_50px_-12px_rgba(109,75,201,0.06)] space-y-7 animate-fade-in-up animation-delay-400"
          style={{
            transform: `translate(${mousePos.x * 8}px, ${mousePos.y * 8}px) rotateX(${mousePos.y * -6}deg) rotateY(${mousePos.x * 6}deg)`,
            transition: 'transform 0.3s cubic-bezier(0.1, 0.8, 0.3, 1)',
            transformStyle: 'preserve-3d',
            perspective: '1000px'
          }}
        >

          <div>
            <h2 className="text-3xl font-extrabold text-zinc-800 tracking-tight">Sign In</h2>
          </div>

          <form onSubmit={submit} className="space-y-5">
            {/* Username/Email Input */}
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#6d4bc9] transition-colors">
                <User size={18} strokeWidth={2.2} />
              </span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                type="text"
                autoComplete="username"
                className="w-full h-11 pl-11 pr-4 bg-white border border-zinc-200 rounded-full text-zinc-800 placeholder-zinc-400 outline-none transition focus:border-[#6d4bc9]/80 focus:ring-1 focus:ring-[#6d4bc9]/80 text-sm"
                placeholder="Username or email"
                required
              />
            </div>

            {/* Password Input */}
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#6d4bc9] transition-colors">
                <Lock size={18} strokeWidth={2.2} />
              </span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="w-full h-11 pl-11 pr-12 bg-white border border-zinc-200 rounded-full text-zinc-800 placeholder-zinc-400 outline-none transition focus:border-[#6d4bc9]/80 focus:ring-1 focus:ring-[#6d4bc9]/80 text-sm"
                placeholder="Password"
                required
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="w-full h-11 flex items-center justify-center rounded-full bg-gradient-to-r from-[#5a38a7] to-[#7653d4] text-white font-semibold text-sm shadow-md shadow-[#5a38a7]/10 hover:shadow-[#5a38a7]/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
