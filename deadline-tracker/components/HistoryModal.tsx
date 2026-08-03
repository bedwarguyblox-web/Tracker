"use client";

import type { Deadline, DeadlineHistoryEntry } from "@/lib/types";

const FIELD_LABELS: Record<string, string> = {
  subject: "Subject",
  activity: "Activity",
  description: "Description",
  due_date: "Due date",
  priority: "Priority",
  attachment_url: "Attachment link",
  pinned: "Pinned",
};

export default function HistoryModal({
  deadline,
  entries,
  loading,
  onClose,
}: {
  deadline: Deadline | null;
  entries: DeadlineHistoryEntry[];
  loading: boolean;
  onClose: () => void;
}) {
  if (!deadline) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 dark:bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-card bg-paper dark:bg-[#171C22] border border-folder-100 dark:border-folder-800 shadow-cardHover p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Edit history</h2>
            <p className="text-sm text-folder-500">{deadline.activity}</p>
          </div>
          <button onClick={onClose} className="text-folder-500 hover:text-folder-800 text-sm">
            Close
          </button>
        </div>

        {loading && <p className="text-sm text-folder-500">Loading…</p>}

        {!loading && entries.length === 0 && (
          <p className="text-sm text-folder-500">No edits recorded yet — this is the original entry.</p>
        )}

        <ol className="space-y-3">
          {entries.map((e) => (
            <li
              key={e.id}
              className="rounded-lg border border-folder-100 dark:border-folder-800 p-3 text-sm"
            >
              <div className="flex justify-between text-xs text-folder-500 font-mono mb-1">
                <span>{e.editor_email}</span>
                <span>{new Date(e.edited_at).toLocaleString()}</span>
              </div>
              <div className="font-medium">{FIELD_LABELS[e.field_name] || e.field_name}</div>
              <div className="mt-1 text-folder-600 dark:text-folder-300">
                <span className="line-through opacity-60">{e.previous_value || "—"}</span>
                {" → "}
                <span className="font-medium">{e.new_value || "—"}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
