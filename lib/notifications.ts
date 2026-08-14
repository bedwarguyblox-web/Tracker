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

/**
 * Registers the service worker that actually shows notifications on
 * Android Chrome (which refuses `new Notification()` outright and
 * only allows `registration.showNotification()`). Safe to call
 * repeatedly — the browser no-ops if it's already registered. Call
 * this once, early, on app load, so it's ready by the time a
 * notification needs to fire.
 */
export async function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.warn("Service worker registration failed; notifications may not work on this browser.", err);
  }
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
 * closed, this would need the Push API and a small server component
 * to trigger pushes — this app checks on load and on an interval
 * while the tab is open instead, which covers the common case
 * without extra server infrastructure.
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
 * Shows a notification via the service worker when one is available
 * (required on Android Chrome — `new Notification()` throws there),
 * falling back to the plain constructor for browsers that support it
 * directly. If neither works, fails quietly rather than crashing.
 */
async function fireNotification(title: string, options: NotificationOptions) {
  try {
    if ("serviceWorker" in navigator) {
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
      ]);
      if (registration) {
        await (registration as ServiceWorkerRegistration).showNotification(title, options);
        return;
      }
    }
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

/** Fires an immediate one-off notification so someone can confirm it actually works. */
export function sendTestNotification(): boolean {
  if (!("Notification" in window) || Notification.permission !== "granted") return false;
  fireNotification("Test notification", {
    body: "If you can see this, deadline reminders are working.",
    tag: "test-notification",
  });
  return true;
}

/**
 * Clears the "already notified today" log, so previously-dismissed
 * reminders are eligible to fire again on the next check. Doesn't
 * touch any deadline data — purely a local notification-state reset.
 */
export function clearNotificationLog() {
  localStorage.removeItem(STORAGE_KEY);
}
