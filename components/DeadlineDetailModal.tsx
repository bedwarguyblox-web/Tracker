"use client";

import type { Deadline } from "@/lib/types";
import {
  getUrgencyStage,
  getStageStyles,
  getRemainingLabel,
  formatDueDate,
  subjectTagClass,
} from "@/lib/utils";

export default function DeadlineDetailModal({
  deadline,
  canEdit,
  onClose,
  onEdit,
  onTogglePin,
  onViewHistory,
  onDelete,
  onRestore,
}: {
  deadline: Deadline;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (d: Deadline) => void;
  onTogglePin: (d: Deadline) => void;
  onViewHistory: (d: Deadline) => void;
  onDelete: (d: Deadline) => void;
  onRestore: (d: Deadline) => void;
}) {
  const stage = getUrgencyStage(deadline.due_date);
  const styles = getStageStyles(stage);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 dark:bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-card bg-surface dark:bg-surface-dark border border-folder-100 dark:border-folder-800 shadow-cardHover"
      >
        {/* drag-handle affordance, purely visual, hints "this is a sheet" */}
        <div className="flex justify-center pt-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-folder-200 dark:bg-folder-700" />
        </div>

        <div className="p-5 sm:p-6">
          {deadline.deleted && (
            <div className="mb-4 rounded-lg bg-stamp-overdue/10 border border-stamp-overdue/30 px-3 py-2 text-xs text-stamp-overdue font-mono">
              Deleted by {deadline.deleted_by || "unknown"}
              {deadline.deleted_at && ` · ${new Date(deadline.deleted_at).toLocaleString()}`}
            </div>
          )}

          <div className="flex items-start justify-between gap-3 mb-3">
            <span
              className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${subjectTagClass(
                deadline.subject
              )}`}
            >
              {deadline.subject}
            </span>
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 text-folder-400 hover:text-folder-700 dark:hover:text-folder-200 text-xl leading-none px-1"
            >
              ×
            </button>
          </div>

          <h2 className="font-display text-2xl font-semibold leading-snug break-words">
            {deadline.activity}
          </h2>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <div className={`rounded-lg border px-3 py-1.5 font-mono text-sm ${styles.badge}`}>
              <span className="uppercase tracking-wide text-[10px] opacity-80 mr-1.5">
                {styles.label}
              </span>
              <span className="font-semibold">{getRemainingLabel(deadline.due_date)}</span>
            </div>
            {deadline.pinned && (
              <span className="text-sm text-stamp-yellow" title="Pinned">
                📌 Pinned
              </span>
            )}
            {deadline.priority && deadline.priority !== "normal" && (
              <span className="text-xs rounded-full border border-folder-200 dark:border-folder-700 px-2.5 py-1 capitalize text-folder-600 dark:text-folder-300">
                {deadline.priority} priority
              </span>
            )}
          </div>

          <p className="text-sm text-folder-500 dark:text-folder-400 mt-3 font-mono">
            {formatDueDate(deadline.due_date)}
          </p>

          {deadline.description ? (
            <p className="text-base text-folder-700 dark:text-folder-200 mt-4 whitespace-pre-wrap break-words leading-relaxed">
              {deadline.description}
            </p>
          ) : (
            <p className="text-sm text-folder-400 mt-4 italic">No description added.</p>
          )}

          {deadline.attachment_url && (
            <a
              href={deadline.attachment_url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm underline text-folder-600 dark:text-folder-300 break-all"
            >
              🔗 {deadline.attachment_url}
            </a>
          )}

          <div className="mt-5 pt-4 border-t border-folder-100 dark:border-folder-800 text-xs text-folder-500 dark:text-folder-400 space-y-1">
            <div>Added by {deadline.created_by}</div>
            {deadline.last_edited_by && (
              <div>Last edited by {deadline.last_edited_by}</div>
            )}
            {deadline.edit_count > 0 && (
              <button
                onClick={() => onViewHistory(deadline)}
                className="underline decoration-dotted hover:text-folder-700 dark:hover:text-folder-200"
              >
                View edit history (×{deadline.edit_count})
              </button>
            )}
          </div>

          {canEdit && (
            <div className="mt-5 flex flex-wrap gap-2">
              {deadline.deleted ? (
                <button
                  onClick={() => {
                    onRestore(deadline);
                    onClose();
                  }}
                  className="rounded-full bg-folder-700 text-white px-4 py-2 text-sm hover:bg-folder-800"
                >
                  Restore
                </button>
              ) : (
                <>
                  <button
                    onClick={() => onTogglePin(deadline)}
                    className="rounded-full border border-folder-200 dark:border-folder-700 px-4 py-2 text-sm hover:bg-folder-50 dark:hover:bg-folder-900"
                  >
                    {deadline.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button
                    onClick={() => {
                      onEdit(deadline);
                      onClose();
                    }}
                    className="rounded-full bg-folder-700 text-white px-4 py-2 text-sm hover:bg-folder-800"
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
                        onClose();
                      }
                    }}
                    className="rounded-full border border-stamp-red/40 text-stamp-red px-4 py-2 text-sm hover:bg-stamp-red/10"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
