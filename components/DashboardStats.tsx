"use client";

import { differenceInCalendarDays, isPast } from "date-fns";
import type { Deadline } from "@/lib/types";

export default function DashboardStats({ deadlines: allDeadlines }: { deadlines: Deadline[] }) {
  const now = new Date();
  const deadlines = allDeadlines.filter((d) => !d.deleted);

  const upcoming = deadlines.filter((d) => {
    const days = differenceInCalendarDays(new Date(d.due_date), now);
    return days >= 0;
  }).length;

  const overdue = deadlines.filter((d) => isPast(new Date(d.due_date)) && differenceInCalendarDays(new Date(d.due_date), now) < 0).length;

  const today = deadlines.filter(
    (d) => differenceInCalendarDays(new Date(d.due_date), now) === 0
  ).length;

  const pinned = deadlines.filter((d) => d.pinned).length;

  const recentlyEdited = deadlines.filter((d) => {
    if (!d.last_edited_at) return false;
    const hours = (now.getTime() - new Date(d.last_edited_at).getTime()) / 36e5;
    return hours <= 48;
  }).length;

  const stats = [
    { label: "Upcoming", value: upcoming, tone: "text-folder-700 dark:text-folder-300" },
    { label: "Due today", value: today, tone: "text-stamp-red" },
    { label: "Overdue", value: overdue, tone: "text-stamp-overdue" },
    { label: "Pinned", value: pinned, tone: "text-stamp-yellow" },
    { label: "Recently edited", value: recentlyEdited, tone: "text-folder-500" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-card border border-folder-100 dark:border-folder-800 bg-white/60 dark:bg-white/[0.03] px-4 py-3 shadow-card"
        >
          <div className={`font-display text-2xl font-semibold ${s.tone}`}>{s.value}</div>
          <div className="text-xs uppercase tracking-wide text-folder-500 dark:text-folder-400 mt-0.5">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
