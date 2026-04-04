import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      className="relative h-8 w-[3.25rem] shrink-0 rounded-full border border-gray-300/90 bg-gray-200/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/15 dark:bg-zinc-700/90 dark:focus-visible:ring-offset-zinc-900"
    >
      <span
        className="absolute top-0.5 left-0.5 flex h-7 w-7 translate-x-0 items-center justify-center rounded-full bg-white text-amber-500 shadow-sm transition-transform duration-200 dark:translate-x-5 dark:text-sky-200"
        aria-hidden
      >
        {isDark ? <Moon size={15} strokeWidth={2} /> : <Sun size={15} strokeWidth={2} />}
      </span>
    </button>
  );
}
