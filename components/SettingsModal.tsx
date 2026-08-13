"use client";

import { useEffect, useState } from "react";
import { X, Check, Bell, RotateCcw } from "lucide-react";
import {
  requestNotificationPermission,
  sendTestNotification,
  clearNotificationLog,
} from "@/lib/notifications";
import type { TabKey, SortKey } from "@/lib/types";

const TAB_OPTIONS: { value: TabKey; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "today", label: "Today" },
  { value: "pinned", label: "Pinned" },
  { value: "overdue", label: "Overdue" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "closest", label: "Closest first" },
  { value: "furthest", label: "Furthest first" },
  { value: "recent", label: "Recently edited" },
  { value: "subject", label: "Subject" },
];

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
  const [testSent, setTestSent] = useState(false);
  const [reminderReset, setReminderReset] = useState(false);
  const [defaultTab, setDefaultTab] = useState<TabKey>("upcoming");
  const [defaultSort, setDefaultSort] = useState<SortKey>("closest");

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    if (typeof Notification === "undefined") {
      setNotifPermission("unsupported");
    } else {
      setNotifPermission(Notification.permission);
    }
    const storedTab = localStorage.getItem("mrc-default-tab") as TabKey | null;
    const storedSort = localStorage.getItem("mrc-default-sort") as SortKey | null;
    if (storedTab) setDefaultTab(storedTab);
    if (storedSort) setDefaultSort(storedSort);
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

  function handleTestNotification() {
    const sent = sendTestNotification();
    if (sent) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 2500);
    }
  }

  function handleResetReminders() {
    clearNotificationLog();
    setReminderReset(true);
    setTimeout(() => setReminderReset(false), 2500);
  }

  function handleDefaultTabChange(value: TabKey) {
    setDefaultTab(value);
    localStorage.setItem("mrc-default-tab", value);
  }

  function handleDefaultSortChange(value: SortKey) {
    setDefaultSort(value);
    localStorage.setItem("mrc-default-sort", value);
  }

  const initials =
    (fullName?.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("") || email[0] || "?")
      .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up w-full sm:max-w-md max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-card bg-surface dark:bg-surface-dark border border-folder-100 dark:border-folder-800 shadow-cardHover"
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="font-display text-xl font-semibold">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-folder-400 hover:text-folder-700 dark:hover:text-folder-200 p-1 rounded-full hover:bg-folder-50 dark:hover:bg-folder-900"
          >
            <X size={20} />
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
              className="w-full flex items-center justify-between rounded-xl bg-folder-50 dark:bg-folder-900/40 px-4 py-3 text-sm transition-colors hover:bg-folder-100 dark:hover:bg-folder-900/60"
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

          {/* Preferences */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-folder-500 dark:text-folder-400 mb-2">
              Preferences
            </h3>
            <div className="rounded-xl bg-folder-50 dark:bg-folder-900/40 p-4 space-y-3">
              <label className="block">
                <span className="block text-xs text-folder-500 dark:text-folder-400 mb-1">
                  Default tab when opening a section
                </span>
                <select
                  value={defaultTab}
                  onChange={(e) => handleDefaultTabChange(e.target.value as TabKey)}
                  className="w-full rounded-lg border border-folder-200 dark:border-folder-700 bg-white dark:bg-black/20 px-3 py-2 text-sm"
                >
                  {TAB_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs text-folder-500 dark:text-folder-400 mb-1">
                  Default sort order
                </span>
                <select
                  value={defaultSort}
                  onChange={(e) => handleDefaultSortChange(e.target.value as SortKey)}
                  className="w-full rounded-lg border border-folder-200 dark:border-folder-700 bg-white dark:bg-black/20 px-3 py-2 text-sm"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* Notifications */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-folder-500 dark:text-folder-400 mb-2">
              Notifications
            </h3>
            <div className="rounded-xl bg-folder-50 dark:bg-folder-900/40 p-4">
              {notifPermission === "granted" && (
                <>
                  <p className="flex items-start gap-1.5 text-sm text-stamp-normal font-medium mb-3">
                    <Check size={16} className="shrink-0 mt-0.5" />
                    <span>Enabled — you'll get reminders at 3, 2, 1 days and on the due date.</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleTestNotification}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-folder-200 dark:border-folder-700 px-3 py-2 text-sm hover:bg-white dark:hover:bg-black/20 transition-colors"
                    >
                      <Bell size={14} />
                      {testSent ? "Sent!" : "Send test"}
                    </button>
                    <button
                      onClick={handleResetReminders}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-folder-200 dark:border-folder-700 px-3 py-2 text-sm hover:bg-white dark:hover:bg-black/20 transition-colors"
                    >
                      <RotateCcw size={14} />
                      {reminderReset ? "Reset!" : "Reset reminders"}
                    </button>
                  </div>
                </>
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
