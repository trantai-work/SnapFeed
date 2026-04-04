import { useEffect } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import logo from "../assets/logo.png";
import logoLightMode from "../assets/logo_light_mode.png";
import { useTheme } from "../context/ThemeContext";

const CONTACT_EMAIL = "snapfeed.dev.dut@gmail.com";

export default function PrivacyPolicyPage() {
  const { theme } = useTheme();
  useEffect(() => {
    const prev = document.title;
    document.title = "Privacy Policy | SnapFeed";
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
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
          SnapFeed (&quot;we&quot;) is committed to protecting your privacy. This policy explains how we collect, use, store, and safeguard your information when you use the SnapFeed application and services (collectively, the &quot;Service&quot;).
        </p>
        <div className="mt-2 mb-8">
          <p className="text-xs italic text-gray-400 dark:text-zinc-500">
            Disclaimer: SnapFeed is not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc.
          </p>
        </div>

        <section className="mt-10 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">1. Scope</h2>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
            This policy applies to users who access the SnapFeed website or mobile app, including features for browsing content, logging in, and uploading content (such as videos), under the Service’s terms.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">2. Information We Collect</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
            <li>
              <span className="font-medium text-gray-800 dark:text-zinc-200">Account Information:</span> When you log in using Google or Facebook (Meta) Login, we may collect information provided by the login provider according to the permissions you grant. This may include your name, email address, profile picture, account identifiers, and public profile information. Data collected from Facebook Login is handled in accordance with Facebook's applicable policies and your granted permissions.
            </li>
            <li>
              <span className="font-medium text-gray-800 dark:text-zinc-200">User-generated Content:</span> Content you upload or send through the Service (for example: videos, descriptions, or thumbnails) and associated metadata necessary for display and operation.
            </li>
            <li>
              <span className="font-medium text-gray-800 dark:text-zinc-200">Technical & Usage Data:</span>{" "}
              Device information, browser details, IP address, technical logs, and basic usage data for security, abuse prevention, and improving the Service.
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">3. Purpose of Use</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
            <li>To provide, maintain, and improve the Service;</li>
            <li>To verify accounts and protect user safety;</li>
            <li>To store, process, and display content according to app functionality;</li>
            <li>To comply with legal obligations as required.</li>
          </ul>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
            4. Cookies & Local Storage
          </h2>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
            We may use cookies or similar browser storage mechanisms to maintain your login session, preferences, and security. You may adjust your browser settings to reject cookies; some features may not function properly if cookies are disabled.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">5. Third-Party Sharing</h2>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
            We do not sell your personal data. Information may be shared in the following circumstances:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
            <li>
              <span className="font-medium text-gray-800 dark:text-zinc-200">Login Providers:</span> Google and Meta (Facebook), according to their respective terms and privacy policies, based on your agreement when you sign in.
            </li>
            <li>
              <span className="font-medium text-gray-800 dark:text-zinc-200">Infrastructure Providers:</span> Cloud storage, server, and technical service providers that help operate the Service (e.g., file storage for videos), under contracts requiring data protection.
            </li>
            <li>
              <span className="font-medium text-gray-800 dark:text-zinc-200">Legal Requirements:</span> When required by law or to protect the rights and safety of users and SnapFeed.
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">6. Security</h2>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
            We implement reasonable technical and organizational safeguards to protect your information. No method of transmission or storage is completely secure; you should also protect your login credentials and devices.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">7. Your Rights</h2>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
            Depending on the laws of your country or region, you may have rights such as access, correction, erasure, data processing restriction, objection, or withdrawal of consent. To exercise these rights, please contact us below. You can stop using the Service and revoke app permissions in your Google or Facebook account settings.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">8. Children</h2>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
            The Service is not directed to children under ages prohibited by local law for data collection without parental consent. If you are a parent and believe your child has provided us with data, please contact us so we can assist.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">9. Changes to this Policy</h2>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
            We may update this policy from time to time. The new version will be posted here along with the updated date. By continuing to use the Service after changes become effective, you accept those adjustments (unless otherwise required by law).
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">10. Contact</h2>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
            If you have questions about this privacy policy or your personal data, please contact:
          </p>
          {CONTACT_EMAIL ? (
            <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-pink-600 underline hover:text-pink-700"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
              Please set the environment variable{" "}
              <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-zinc-800">snapfeed.dev.dut@gmail.com</code>{" "}
              on the build server to display a public contact email here.
            </p>
          )}
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        © {new Date().getFullYear()} SnapFeed
      </footer>
    </div>
  );
}
