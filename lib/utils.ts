import { differenceInCalendarDays, differenceInHours, differenceInMinutes, isPast } from "date-fns";
import type { UrgencyStage } from "./types";

/**
 * Determines the urgency stage of a deadline based on the spec's
 * color progression: normal -> yellow (7d) -> orange (3d) -> red (today) -> overdue.
 */
export function getUrgencyStage(dueDate: string | Date): UrgencyStage {
  const due = new Date(dueDate);
  const now = new Date();
  const daysLeft = differenceInCalendarDays(due, now);

  if (isPast(due) && daysLeft < 0) return "overdue";
  if (daysLeft <= 0) return "today";
  if (daysLeft <= 3) return "orange";
  if (daysLeft <= 7) return "yellow";
  return "normal";
}

export function getStageStyles(stage: UrgencyStage) {
  switch (stage) {
    case "overdue":
      return {
        badge: "bg-stamp-overdue/10 text-stamp-overdue border-stamp-overdue/30",
        edge: "bg-stamp-overdue",
        label: "Overdue",
      };
    case "today":
      return {
        badge: "bg-stamp-red/10 text-stamp-red border-stamp-red/30",
        edge: "bg-stamp-red",
        label: "Due today",
      };
    case "orange":
      return {
        badge: "bg-stamp-orange/10 text-stamp-orange border-stamp-orange/30",
        edge: "bg-stamp-orange",
        label: "Due soon",
      };
    case "yellow":
      return {
        badge: "bg-stamp-yellow/10 text-stamp-yellow border-stamp-yellow/30",
        edge: "bg-stamp-yellow",
        label: "Coming up",
      };
    default:
      return {
        badge: "bg-stamp-normal/10 text-stamp-normal border-stamp-normal/30",
        edge: "bg-stamp-normal",
        label: "Scheduled",
      };
  }
}

/** Human label like "3 days left", "Due today", "8 hours left", "Overdue by 2 days" */
export function getRemainingLabel(dueDate: string | Date): string {
  const due = new Date(dueDate);
  const now = new Date();

  // Base "overdue" on the actual instant, never on a truncated hour/day count —
  // differenceInHours/differenceInCalendarDays round toward zero, so a deadline
  // that's still minutes in the future can otherwise show as "0 hours left" and
  // get misread as overdue.
  if (isPast(due)) {
    const daysLeft = differenceInCalendarDays(due, now);
    const overdueDays = Math.abs(daysLeft);
    if (overdueDays >= 1) {
      return overdueDays === 1 ? "Overdue by 1 day" : `Overdue by ${overdueDays} days`;
    }
    return "Overdue";
  }

  const daysLeft = differenceInCalendarDays(due, now);

  if (daysLeft === 0) {
    const hoursLeft = differenceInHours(due, now);
    if (hoursLeft >= 1) {
      return hoursLeft === 1 ? "1 hour left" : `${hoursLeft} hours left`;
    }
    const minutesLeft = Math.max(1, differenceInMinutes(due, now));
    return minutesLeft === 1 ? "1 minute left" : `${minutesLeft} minutes left`;
  }

  return daysLeft === 1 ? "1 day left" : `${daysLeft} days left`;
}

export function formatDueDate(dueDate: string | Date): string {
  const due = new Date(dueDate);
  return due.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }) + " · " + due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "mrc.pshs.edu.ph";
  return email.toLowerCase().endsWith(`@${domain.toLowerCase()}`);
}
