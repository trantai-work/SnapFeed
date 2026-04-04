import { useEffect } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import logo from "../assets/logo.png";
import logoLightMode from "../assets/logo_light_mode.png";
import { useTheme } from "../context/ThemeContext";

const CONTACT_EMAIL = "snapfeed.dev.dut@gmail.com";

export default function DeleteDataPage() {
  const { theme } = useTheme();
  useEffect(() => {
    const prev = document.title;
    document.title = "Data Deletion Instructions | SnapFeed";
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-semibold text-pink-600 hover:text-pink-700"
          >
            <img
              src={theme === "light" ? logoLightMode : logo}
              alt="SnapFeed"
              className="h-9 w-auto max-w-[min(200px,55vw)] object-contain object-left sm:h-10"
            />
            <span className="hidden sm:inline">Back to SnapFeed</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-xs text-gray-500 dark:text-zinc-400">Updated: April 4, 2026</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-3 py-8 sm:px-6 sm:py-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-zinc-50">
          Data Deletion Instructions
        </h1>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
          <p>
            If you have an account with SnapFeed or have used our services, you may request
            deletion of your personal data associated with SnapFeed. We will process verified
            requests within <span className="font-medium text-gray-800 dark:text-zinc-200">seven (7) business days</span>{" "}
            of receipt, subject to any legal or technical obligations that require us to retain
            certain information for a limited period.
          </p>

          <p>
            To submit a data deletion request, please email us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=SnapFeed%20Data%20Deletion%20Request`}
              className="font-medium text-pink-600 underline hover:text-pink-700"
            >
              {CONTACT_EMAIL}
            </a>
            . Include the email address you used to sign in (if applicable) and a brief
            description of the data you wish to have removed. We may ask for reasonable
            information to verify your identity before completing the request.
          </p>

          <p>
            In addition, you may revoke SnapFeed&apos;s access to data provided through{" "}
            <span className="font-medium text-gray-800 dark:text-zinc-200">Facebook</span> or{" "}
            <span className="font-medium text-gray-800 dark:text-zinc-200">Google</span> at any time by using your
            account settings on those platforms (for example, removing the app or adjusting
            permissions under Apps and Websites or connected apps). Revoking access may limit or
            end your ability to use SnapFeed features that depend on that login.
          </p>

          <p className="text-xs text-gray-500 dark:text-zinc-500">
            This page is provided for transparency and compliance purposes. SnapFeed is not
            affiliated with, endorsed by, or sponsored by Meta Platforms, Inc. or Google LLC.
          </p>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        © {new Date().getFullYear()} SnapFeed
      </footer>
    </div>
  );
}
