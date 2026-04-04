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
    <span className="grid size-7 place-items-center rounded-full bg-gray-300 text-gray-700 dark:bg-[#2a2a2a] dark:text-white">
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
        "flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3",
        "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300",
        "dark:bg-[#2a2a2a] dark:text-white dark:hover:bg-[#333] dark:active:bg-[#3a3a3a]",
        "transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variant === "default" ? "" : ""
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
            "rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl",
            "dark:border-white/10 dark:bg-[#111] dark:text-white"
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
                "bg-gray-100 hover:bg-gray-200 active:bg-gray-300 dark:bg-white/10 dark:hover:bg-white/15 dark:active:bg-white/20",
                "transition-colors cursor-pointer"
              )}
            >
              <X size={18} />
            </button>

            <h2 className="text-center text-[32px] leading-tight font-extrabold tracking-tight">
              Đăng nhập vào
              <br />
              SnapFeed
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

            <p className="mt-4 text-center text-[11px] leading-relaxed text-gray-500 dark:text-white/55">
              Chào mừng bạn đến với Snapfeed! Hãy đăng nhập để bắt đầu trải nghiệm các tính năng tuyệt vời của chúng tôi.{" "}
              <Link
                to="/privacy-policy"
                onClick={() => onClose?.()}
                className="text-pink-600 underline decoration-gray-300 underline-offset-2 hover:text-pink-500 dark:text-pink-400 dark:decoration-white/20 dark:hover:text-pink-300"
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
