"use client";

import type { TabKey } from "@/lib/types";

const TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "today", label: "Today" },
  { key: "pinned", label: "Pinned" },
  { key: "overdue", label: "Overdue" },
  { key: "history", label: "History" },
];

export default function TabsNav({
  active,
  onChange,
  counts,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
  counts: Record<TabKey, number>;
}) {
  return (
    <div role="tablist" aria-label="Deadline sections" className="flex gap-1 overflow-x-auto pb-1">
      {TABS.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.key)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors border ${
              isActive
                ? "bg-folder-700 text-white border-folder-700"
                : "bg-transparent text-folder-600 dark:text-folder-300 border-folder-200 dark:border-folder-700 hover:bg-folder-50 dark:hover:bg-folder-900"
            }`}
          >
            {t.label}
            <span
              className={`ml-1.5 text-xs ${isActive ? "text-folder-100" : "text-folder-400"}`}
            >
              {counts[t.key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
