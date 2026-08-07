"use client";

import { useState } from "react";
import type { Deadline } from "@/lib/types";
import { getUrgencyStage, getStageStyles, getRemainingLabel, formatDueDate } from "@/lib/utils";

export default function DeadlineCard({
  deadline,
  canEdit,
  onEdit,
  onTogglePin,
  onViewHistory,
  onDelete,
  onRestore,
}: {
  deadline: Deadline;
  canEdit: boolean;
  onEdit: (d: Deadline) => void;
  onTogglePin: (d: Deadline) => void;
  onViewHistory: (d: Deadline) => void;
  onDelete: (d: Deadline) => void;
  onRestore: (d: Deadline) => void;
}) {
  const stage = getUrgencyStage(deadline.due_date);
  const styles = getStageStyles(stage);
  const [pinBusy, setPinBusy] = useState(false);

  return (
    <div
      className={`group relative flex rounded-card border border-folder-100 dark:border-folder-800 bg-white/70 dark:bg-white/[0.03] shadow-card hover:shadow-cardHover transition-shadow overflow-hidden ${
        deadline.pinned ? "ring-1 ring-stamp-yellow/40" : ""
      }`}
    >
      {/* urgency tab edge — the "stamp" signature element */}
      <div className={`w-1.5 shrink-0 ${styles.edge}`} aria-hidden />

      <div className="flex-1 p-4 sm:p-5">
        {deadline.deleted && (
          <div className="mb-3 rounded-lg bg-stamp-overdue/10 border border-stamp-overdue/30 px-3 py-2 text-xs text-stamp-overdue font-mono">
            Deleted by {deadline.deleted_by || "unknown"}
            {deadline.deleted_at && ` · ${new Date(deadline.deleted_at).toLocaleString()}`}
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] uppercase tracking-wider text-folder-500 dark:text-folder-400">
                {deadline.subject}
              </span>
              {deadline.pinned && (
                <span className="text-xs text-stamp-yellow" title="Pinned">
                  📌
                </span>
              )}
              {deadline.edit_count > 0 && (
                <button
                  onClick={() => onViewHistory(deadline)}
                  className="text-[11px] font-mono text-folder-400 hover:text-folder-600 underline decoration-dotted"
                  title="View edit history"
                >
                  edited ×{deadline.edit_count}
                </button>
              )}
            </div>
            <h3 className="font-display text-lg font-semibold leading-snug mt-0.5 truncate">
              {deadline.activity}
            </h3>
            {deadline.description && (
              <p className="text-sm text-folder-600 dark:text-folder-300 mt-1 line-clamp-2">
                {deadline.description}
              </p>
            )}
          </div>

          {/* the due-date "stamp" */}
          <div
            className={`shrink-0 rounded-lg border px-3 py-2 text-center font-mono ${styles.badge}`}
          >
            <div className="text-[10px] uppercase tracking-wide opacity-80">{styles.label}</div>
            <div className="text-sm font-semibold whitespace-nowrap">
              {getRemainingLabel(deadline.due_date)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-folder-100 dark:border-folder-800">
          <div className="text-xs text-folder-500 dark:text-folder-400 space-x-3">
            <span>{formatDueDate(deadline.due_date)}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">by {deadline.created_by}</span>
            {deadline.last_edited_by && (
              <>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline">edited by {deadline.last_edited_by}</span>
              </>
            )}
            {deadline.attachment_url && (
              <>
                <span>·</span>
                <a
                  href={deadline.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-folder-600 dark:text-folder-300"
                >
                  attachment
                </a>
              </>
            )}
          </div>

          {canEdit && deadline.deleted && (
            <div className="flex gap-2">
              <button
                onClick={() => onRestore(deadline)}
                className="text-xs rounded-full bg-folder-700 text-white px-3 py-1 hover:bg-folder-800"
              >
                Restore
              </button>
            </div>
          )}

          {canEdit && !deadline.deleted && (
            <div className="flex gap-2">
              <button
                disabled={pinBusy}
                onClick={async () => {
                  setPinBusy(true);
                  await onTogglePin(deadline);
                  setPinBusy(false);
                }}
                className="text-xs rounded-full border border-folder-200 dark:border-folder-700 px-3 py-1 hover:bg-folder-50 dark:hover:bg-folder-900"
              >
                {deadline.pinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={() => onEdit(deadline)}
                className="text-xs rounded-full bg-folder-700 text-white px-3 py-1 hover:bg-folder-800"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete "${deadline.activity}"? This can be undone from the Deleted tab.`
                    )
                  ) {
                    onDelete(deadline);
                  }
                }}
                className="text-xs rounded-full border border-stamp-red/40 text-stamp-red px-3 py-1 hover:bg-stamp-red/10"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
