"use client";

import { GitMerge } from "lucide-react";
import type { SortKey } from "@/lib/types";

export default function SearchFilterBar({
  query,
  onQuery,
  subjects,
  subjectFilter,
  onSubjectFilter,
  priorityFilter,
  onPriorityFilter,
  sort,
  onSort,
  canEdit,
  onManageSubjects,
}: {
  query: string;
  onQuery: (v: string) => void;
  subjects: string[];
  subjectFilter: string;
  onSubjectFilter: (v: string) => void;
  priorityFilter: string;
  onPriorityFilter: (v: string) => void;
  sort: SortKey;
  onSort: (v: SortKey) => void;
  canEdit: boolean;
  onManageSubjects: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
      <input
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search activity, subject, or description…"
        className="flex-1 rounded-full border border-folder-200 dark:border-folder-700 bg-white/70 dark:bg-white/5 px-4 py-2 text-sm outline-none focus:border-folder-500"
      />
      <div className="flex gap-2 flex-wrap items-center">
        <select
          value={subjectFilter}
          onChange={(e) => onSubjectFilter(e.target.value)}
          className="rounded-full border border-folder-200 dark:border-folder-700 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm"
        >
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {canEdit && subjects.length > 1 && (
          <button
            onClick={onManageSubjects}
            title="Merge duplicate subjects"
            aria-label="Merge duplicate subjects"
            className="rounded-full border border-folder-200 dark:border-folder-700 p-2 text-folder-500 hover:text-folder-700 hover:bg-folder-50 dark:hover:bg-folder-900 transition-colors"
          >
            <GitMerge size={16} />
          </button>
        )}

        <select
          value={priorityFilter}
          onChange={(e) => onPriorityFilter(e.target.value)}
          className="rounded-full border border-folder-200 dark:border-folder-700 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm"
        >
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>

        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          className="rounded-full border border-folder-200 dark:border-folder-700 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm"
        >
          <option value="closest">Closest first</option>
          <option value="furthest">Furthest first</option>
          <option value="recent">Recently edited</option>
          <option value="subject">Subject</option>
        </select>
      </div>
    </div>
  );
}
