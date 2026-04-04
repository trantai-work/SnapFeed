import { useEffect } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo_no_text.png";

const CONTACT_EMAIL = "snapfeed.dev.dut@gmail.com";

export default function DeleteDataPage() {
  useEffect(() => {
    const prev = document.title;
    document.title = "Data Deletion Instructions | SnapFeed";
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-semibold text-pink-600 hover:text-pink-700"
          >
            <img src={logo} alt="" className="h-8 w-auto object-contain" />
            <span className="hidden sm:inline">Back to SnapFeed</span>
          </Link>
          <span className="text-xs text-gray-500">Updated: April 4, 2026</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Data Deletion Instructions
        </h1>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-600">
          <p>
            If you have an account with SnapFeed or have used our services, you may request
            deletion of your personal data associated with SnapFeed. We will process verified
            requests within <span className="font-medium text-gray-800">seven (7) business days</span>{" "}
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
            <span className="font-medium text-gray-800">Facebook</span> or{" "}
            <span className="font-medium text-gray-800">Google</span> at any time by using your
            account settings on those platforms (for example, removing the app or adjusting
            permissions under Apps and Websites or connected apps). Revoking access may limit or
            end your ability to use SnapFeed features that depend on that login.
          </p>

          <p className="text-xs text-gray-500">
            This page is provided for transparency and compliance purposes. SnapFeed is not
            affiliated with, endorsed by, or sponsored by Meta Platforms, Inc. or Google LLC.
          </p>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} SnapFeed
      </footer>
    </div>
  );
}
