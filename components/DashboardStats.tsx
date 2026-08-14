"use client";

import { differenceInCalendarDays, isPast } from "date-fns";
import type { Deadline, TabKey } from "@/lib/types";

export default function DashboardStats({
  deadlines: allDeadlines,
  activeTab,
  onSelectTab,
}: {
  deadlines: Deadline[];
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}) {
  const now = new Date();
  // Completed items don't count toward "still needs attention" stats —
  // they've got their own Done stat instead.
  const active = allDeadlines.filter((d) => !d.deleted && !d.completed);

  const upcoming = active.filter(
    (d) => differenceInCalendarDays(new Date(d.due_date), now) >= 0
  ).length;

  const overdue = active.filter(
    (d) => isPast(new Date(d.due_date)) && differenceInCalendarDays(new Date(d.due_date), now) < 0
  ).length;

  const today = active.filter(
    (d) => differenceInCalendarDays(new Date(d.due_date), now) === 0
  ).length;

  const pinned = active.filter((d) => d.pinned).length;

  const done = allDeadlines.filter((d) => !d.deleted && d.completed).length;

  const stats: { label: string; value: number; tone: string; tab: TabKey }[] = [
    { label: "Upcoming", value: upcoming, tone: "text-folder-700 dark:text-folder-300", tab: "upcoming" },
    { label: "Due today", value: today, tone: "text-stamp-red", tab: "today" },
    { label: "Overdue", value: overdue, tone: "text-stamp-overdue", tab: "overdue" },
    { label: "Pinned", value: pinned, tone: "text-stamp-yellow", tab: "pinned" },
    { label: "Done", value: done, tone: "text-stamp-normal", tab: "done" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {stats.map((s) => {
        const isActive = activeTab === s.tab;
        return (
          <button
            key={s.label}
            onClick={() => onSelectTab(s.tab)}
            className={`text-left rounded-card border px-4 py-3 shadow-card hover:shadow-cardHover active:scale-[0.97] transition-all ${
              isActive
                ? "border-folder-400 dark:border-folder-500 bg-folder-50 dark:bg-folder-900/40 ring-1 ring-folder-300 dark:ring-folder-700"
                : "border-folder-100 dark:border-folder-800 bg-surface dark:bg-surface-dark"
            }`}
          >
            <div className={`font-display text-2xl font-semibold ${s.tone}`}>{s.value}</div>
            <div className="text-xs uppercase tracking-wide text-folder-500 dark:text-folder-400 mt-0.5">
              {s.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
