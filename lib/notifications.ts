"use client";

import type { Deadline } from "./types";
import { differenceInCalendarDays } from "date-fns";

const STORAGE_KEY = "mrc-tracker-notified-v1";

type NotifiedLog = Record<string, string>; // `${deadlineId}:${daysLeft}` -> ISO date notified

function readLog(): NotifiedLog {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeLog(log: NotifiedLog) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "default") {
    return Notification.requestPermission();
  }
  return Notification.permission;
}

/**
 * Checks every visible deadline against the 3/2/1-day and due-day
 * milestones and fires a browser notification once per milestone,
 * per deadline, per day. Because the "already notified" state lives
 * in localStorage (not a timer), this naturally "resumes" and catches
 * up whenever the site is reopened, rather than relying on the tab
 * staying open. For true background delivery when the site is fully
 * closed, this would need a Service Worker + the Push API and a small
 * server component to trigger pushes — this app checks on load and on
 * an interval while the tab is open instead, which covers the common
 * case without extra infrastructure.
 */
export function checkAndNotify(deadlines: Deadline[]) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const log = readLog();
  const today = new Date().toDateString();
  let changed = false;

  for (const d of deadlines) {
    const daysLeft = differenceInCalendarDays(new Date(d.due_date), new Date());
    const milestone = [3, 2, 1, 0].includes(daysLeft) ? daysLeft : null;
    if (milestone === null) continue;

    const key = `${d.id}:${milestone}`;
    if (log[key] === today) continue; // already notified today for this milestone

    const title =
      milestone === 0
        ? `Due today: ${d.activity}`
        : `${milestone} day${milestone === 1 ? "" : "s"} left: ${d.activity}`;

    fireNotification(title, {
      body: `${d.subject} — ${d.description || "No description"}`,
      tag: key,
    });

    log[key] = today;
    changed = true;
  }

  if (changed) writeLog(log);
}

/**
 * Some mobile browsers (notably Chrome on Android) don't support the
 * `new Notification()` constructor at all — they throw
 * "Illegal constructor" and require a Service Worker's
 * `registration.showNotification()` instead. Rather than add a full
 * service worker just for this, we try the constructor and fail
 * silently if it's unsupported, so a missed notification never takes
 * down the rest of the app.
 */
function fireNotification(title: string, options: NotificationOptions) {
  try {
    new Notification(title, options);
  } catch (err) {
    console.warn("Notification not supported in this browser; skipping.", err);
  }
}

/** Call once on mount; re-checks on an interval while the tab stays open. */
export function startNotificationLoop(getDeadlines: () => Deadline[]) {
  checkAndNotify(getDeadlines());
  const interval = setInterval(() => checkAndNotify(getDeadlines()), 1000 * 60 * 30); // every 30 min
  return () => clearInterval(interval);
}
