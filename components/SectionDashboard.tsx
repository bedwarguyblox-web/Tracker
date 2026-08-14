"use client";

import { Shield } from "lucide-react";
import type { Section, MemberRole } from "@/lib/types";

export interface SectionWithCount extends Section {
  dueSoonCount: number;
  role: MemberRole;
}

export default function SectionDashboard({
  sections,
  loading,
  canCreate,
  onSelectSection,
  onCreateClick,
  onJoinClick,
}: {
  sections: SectionWithCount[];
  loading: boolean;
  canCreate: boolean;
  onSelectSection: (section: Section) => void;
  onCreateClick: () => void;
  onJoinClick: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-xl font-semibold">Your sections</h2>
          <p className="text-sm text-folder-500 dark:text-folder-400">
            Join with an invite link, or create one for your class.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onJoinClick}
            className="rounded-full px-4 py-2 text-sm border border-folder-200 dark:border-folder-700 hover:bg-folder-50 dark:hover:bg-folder-900"
          >
            Join
          </button>
          {canCreate && (
            <button
              onClick={onCreateClick}
              className="rounded-full px-4 py-2 text-sm bg-folder-500 text-white hover:bg-folder-600"
            >
              Create
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-folder-500 text-center py-14">Loading sections…</p>
      ) : sections.length === 0 ? (
        <div className="rounded-card border border-dashed border-folder-200 dark:border-folder-700 py-14 text-center text-folder-500">
          <p className="font-display text-lg">No sections yet.</p>
          <p className="text-sm mt-1">Join one with an invite link, or create your own.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sections.map((s, i) => (
            <button
              key={s.id}
              onClick={() => onSelectSection(s)}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              className="animate-card-in text-left rounded-card border border-folder-100 dark:border-folder-800 bg-surface dark:bg-surface-dark shadow-card hover:shadow-cardHover active:scale-[0.98] transition-all p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-lg font-semibold leading-snug truncate">
                  {s.name}
                </h3>
                {s.role === "admin" && (
                  <span
                    title="You're an admin"
                    className="shrink-0 text-folder-500 dark:text-folder-400"
                  >
                    <Shield size={14} />
                  </span>
                )}
              </div>
              {s.description ? (
                <p className="text-xs text-folder-500 dark:text-folder-400 mt-1 line-clamp-2">
                  {s.description}
                </p>
              ) : (
                <p className="text-xs font-mono text-folder-400 mt-1">Code: {s.join_code}</p>
              )}
              <div className="mt-3 pt-3 border-t border-folder-100 dark:border-folder-800 flex items-center justify-between">
                <span className="text-xs text-folder-500 dark:text-folder-400">Due soon</span>
                <span className="font-display text-lg font-semibold text-folder-700 dark:text-folder-300">
                  {s.dueSoonCount}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
