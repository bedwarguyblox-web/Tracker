"use client";

import { useEffect, useState } from "react";
import { requestNotificationPermission } from "@/lib/notifications";

export default function SettingsModal({
  email,
  fullName,
  avatarUrl,
  onClose,
  onSignOut,
}: {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const [isDark, setIsDark] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">(
    "default"
  );

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    if (typeof Notification === "undefined") {
      setNotifPermission("unsupported");
    } else {
      setNotifPermission(Notification.permission);
    }
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("mrc-theme", next ? "dark" : "light");
  }

  async function enableNotifications() {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
  }

  const initials =
    (fullName?.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("") || email[0] || "?")
      .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 dark:bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-card bg-surface dark:bg-surface-dark border border-folder-100 dark:border-folder-800 shadow-cardHover"
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="font-display text-xl font-semibold">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-folder-400 hover:text-folder-700 dark:hover:text-folder-200 text-xl leading-none px-1"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Account */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-folder-500 dark:text-folder-400 mb-2">
              Account
            </h3>
            <div className="flex items-center gap-3 rounded-xl bg-folder-50 dark:bg-folder-900/40 p-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-folder-500 text-white flex items-center justify-center font-semibold">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                {fullName && <div className="text-sm font-semibold truncate">{fullName}</div>}
                <div className="text-xs font-mono text-folder-500 dark:text-folder-400 truncate">
                  {email}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                onSignOut();
                onClose();
              }}
              className="mt-3 w-full rounded-full border border-stamp-red/40 text-stamp-red px-4 py-2.5 text-sm font-medium hover:bg-stamp-red/10 transition-colors"
            >
              Sign out
            </button>
          </section>

          {/* Appearance */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-folder-500 dark:text-folder-400 mb-2">
              Appearance
            </h3>
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between rounded-xl bg-folder-50 dark:bg-folder-900/40 px-4 py-3 text-sm"
            >
              <span>{isDark ? "Dark theme" : "Light theme"}</span>
              <span
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isDark ? "bg-folder-500" : "bg-folder-200 dark:bg-folder-700"
                }`}
                aria-hidden
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    isDark ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
          </section>

          {/* Notifications */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-folder-500 dark:text-folder-400 mb-2">
              Notifications
            </h3>
            <div className="rounded-xl bg-folder-50 dark:bg-folder-900/40 p-4">
              {notifPermission === "granted" && (
                <p className="text-sm text-stamp-normal font-medium">
                  ✓ Enabled — you'll get reminders at 3, 2, 1 days and on the due date.
                </p>
              )}
              {notifPermission === "denied" && (
                <p className="text-sm text-folder-600 dark:text-folder-300">
                  Blocked in your browser settings. Enable notifications for this site in your
                  browser's site settings to turn this back on.
                </p>
              )}
              {notifPermission === "unsupported" && (
                <p className="text-sm text-folder-600 dark:text-folder-300">
                  Not supported in this browser.
                </p>
              )}
              {notifPermission === "default" && (
                <>
                  <p className="text-sm text-folder-600 dark:text-folder-300 mb-3">
                    Get a reminder as deadlines get close.
                  </p>
                  <button
                    onClick={enableNotifications}
                    className="w-full rounded-full bg-folder-500 text-white px-4 py-2.5 text-sm font-medium hover:bg-folder-600 transition-colors"
                  >
                    Enable notifications
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
