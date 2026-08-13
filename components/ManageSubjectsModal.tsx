"use client";

import { useState } from "react";
import { GitMerge, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ManageSubjectsModal({
  open,
  onClose,
  subjects,
  activeSectionId,
  onMerged,
}: {
  open: boolean;
  onClose: () => void;
  subjects: string[];
  activeSectionId: string | null;
  onMerged: () => void;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleMerge() {
    if (!from || !to || from === to || !activeSectionId) return;
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("deadlines")
      .update({ subject: to })
      .eq("section_id", activeSectionId)
      .eq("subject", from);
    setBusy(false);
    if (updateError) {
      setError("Couldn't merge those subjects. Please try again.");
      return;
    }
    setFrom("");
    setTo("");
    onMerged();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up w-full sm:max-w-md rounded-t-2xl sm:rounded-card bg-surface dark:bg-surface-dark border border-folder-100 dark:border-folder-800 shadow-cardHover p-6"
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-xl font-semibold">Merge subjects</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-folder-400 hover:text-folder-700 dark:hover:text-folder-200 p-1 rounded-full hover:bg-folder-50 dark:hover:bg-folder-900"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-folder-500 dark:text-folder-400 mb-4">
          Fold near-duplicate subjects (like "Test" and "Last test") into one. Every deadline
          tagged with the first subject gets moved to the second — this can't be undone.
        </p>

        <div className="space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-folder-600 dark:text-folder-300 mb-1">
              Merge this subject…
            </span>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={inputClass}
            >
              <option value="">Choose a subject</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-folder-600 dark:text-folder-300 mb-1">
              …into this one
            </span>
            <select value={to} onChange={(e) => setTo(e.target.value)} className={inputClass}>
              <option value="">Choose a subject</option>
              {subjects
                .filter((s) => s !== from)
                .map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
            </select>
          </label>
        </div>

        {error && <p className="text-xs text-stamp-red mt-2">{error}</p>}

        <button
          onClick={handleMerge}
          disabled={!from || !to || busy}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-folder-500 text-white px-4 py-2.5 text-sm font-medium hover:bg-folder-600 disabled:opacity-50 transition-colors"
        >
          <GitMerge size={16} />
          {busy ? "Merging…" : "Merge"}
        </button>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-folder-200 dark:border-folder-700 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none focus:border-folder-500";
