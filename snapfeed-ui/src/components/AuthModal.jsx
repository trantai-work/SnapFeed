import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import googleLogo from "../assets/google_logo.svg";
import facebookLogo from "../assets/facebook_logo.svg";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function ProviderIcon({ provider }) {
  if (provider === "google") {
    return (
      <span className="grid size-7 place-items-center rounded-full bg-white">
        <img
          src={googleLogo}
          alt="Google"
          className="h-[22px] w-[22px]"
          draggable="false"
        />
      </span>
    );
  }
  if (provider === "facebook") {
    return (
      <span className="grid size-7 place-items-center rounded-full bg-white">
        <img
          src={facebookLogo}
          alt="Facebook"
          className="h-[22px] w-[22px]"
          draggable="false"
        />
      </span>
    );
  }
  return (
    <span className="grid size-7 place-items-center rounded-full bg-[#2a2a2a] text-white">
      <span className="text-xs font-semibold">•</span>
    </span>
  );
}

function ProviderButton({
  icon,
  label,
  badge,
  onClick,
  disabled,
  variant = "default",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classNames(
        "w-full rounded-xl px-4 py-3 cursor-pointer",
        "flex items-center gap-3",
        "bg-[#2a2a2a] hover:bg-[#333] active:bg-[#3a3a3a]",
        "transition-colors",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        variant === "default" ? "text-white" : "text-white"
      )}
    >
      {icon}
      <span className="flex-1 text-left text-sm font-semibold">{label}</span>
      {badge ? (
        <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-[#2fd8ff] text-black">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export default function AuthModal({
  open = false,
  onClose,
  onLoginGoogle,
  onLoginFacebook,
  countryLabel = "Việt Nam",
}) {

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999]">
      {/* overlay */}
      <button
        type="button"
        aria-label="Đóng"
        onClick={() => onClose?.()}
        className="absolute inset-0 bg-black/70 cursor-pointer"
      />

      {/* dialog */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Đăng nhập"
          className={classNames(
            "w-full max-w-[420px]",
            "rounded-2xl bg-[#111] text-white shadow-2xl",
            "border border-white/10"
          )}
        >
          <div className="relative px-6 pt-6">
            <button
              type="button"
              aria-label="Đóng"
              onClick={() => onClose?.()}
              className={classNames(
                "absolute right-4 top-4",
                "grid size-9 place-items-center rounded-full",
                "bg-white/10 hover:bg-white/15 active:bg-white/20",
                "transition-colors cursor-pointer"
              )}
            >
              <X size={18} />
            </button>

            <h2 className="text-center text-[32px] leading-tight font-extrabold tracking-tight">
              Đăng nhập vào
              <br />
              Snapfeed
            </h2>
          </div>

          <div className="px-6 pt-6 pb-4">
            <div className="space-y-3">
              <ProviderButton
                icon={<ProviderIcon provider="google" />}
                label="Tiếp tục với Google"
                onClick={onLoginGoogle}
                disabled={!onLoginGoogle}
              />
              <ProviderButton
                icon={<ProviderIcon provider="facebook" />}
                label="Tiếp tục với Facebook"
                onClick={onLoginFacebook}
                disabled={!onLoginFacebook}
              />
            </div>

            <p className="mt-4 text-center text-[11px] leading-relaxed text-white/55">
              Chào mừng bạn đến với Snapfeed! Hãy đăng nhập để bắt đầu trải nghiệm các tính năng tuyệt vời của chúng tôi.{" "}
              <Link
                to="/privacy"
                onClick={() => onClose?.()}
                className="text-pink-400 underline decoration-white/20 underline-offset-2 hover:text-pink-300"
              >
                Chính sách quyền riêng tư
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
