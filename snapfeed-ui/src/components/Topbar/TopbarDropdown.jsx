import React, { useEffect, useRef } from "react";
import { LogOut, UserRound } from "lucide-react";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function TopbarDropdown({
  open = false,
  onClose,
  onViewProfile,
  onLogout,
  anchor = "top-right",
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    const onPointerDown = (e) => {
      const el = panelRef.current;
      if (!el) return;
      if (el.contains(e.target)) return;
      onClose?.();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const positionClass =
    anchor === "top-right"
      ? "right-0 top-full mt-3"
      : anchor === "top-left"
        ? "left-0 top-full mt-3"
        : "right-0 top-full mt-3";

  return (
    <div className="relative">
      <div
        ref={panelRef}
        role="menu"
        aria-label="Tài khoản"
        className={classNames(
          "absolute z-[999]",
          positionClass,
          "w-[240px] rounded-xl",
          "bg-[#2a2a2a] text-white",
          "shadow-2xl ring-1 ring-white/10",
          "overflow-hidden"
        )}
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onViewProfile?.();
            onClose?.();
          }}
          className={classNames(
            "w-full px-4 py-3",
            "flex items-center gap-3",
            "text-sm font-semibold",
            "cursor-pointer",
            "hover:bg-white/10 active:bg-white/15",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-inset"
          )}
        >
          <UserRound size={18} className="text-white/90" />
          <span>Xem hồ sơ</span>
        </button>

        <div className="h-px bg-white/10" />

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onLogout?.();
            onClose?.();
          }}
          className={classNames(
            "w-full px-4 py-3",
            "flex items-center gap-3",
            "text-sm font-semibold",
            "cursor-pointer",
            "hover:bg-white/10 active:bg-white/15",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-inset"
          )}
        >
          <LogOut size={18} className="text-white/90" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}
