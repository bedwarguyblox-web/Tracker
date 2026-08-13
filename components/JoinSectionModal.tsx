"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Section } from "@/lib/types";

export default function JoinSectionModal({
  open,
  onClose,
  onJoined,
  userEmail,
}: {
  open: boolean;
  onClose: () => void;
  onJoined: (section: Section) => void;
  userEmail: string | null;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!userEmail) return;
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("Enter a join code.");
      return;
    }
    setError("");
    setSubmitting(true);
    const supabase = createClient();

    try {
      const { data: section, error: joinError } = await supabase.rpc(
        "join_section_by_code",
        { p_code: trimmed }
      );

      if (joinError || !section) {
        setError(
          joinError?.message === "Invalid join code"
            ? "No section found with that code."
            : "Couldn't join that section. Please try again."
        );
        return;
      }

      setCode("");
      onJoined(section as Section);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="animate-sheet-up w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-card bg-surface dark:bg-surface-dark border border-folder-100 dark:border-folder-800 shadow-cardHover p-6"
      >
        <h2 className="font-display text-xl font-semibold mb-4">Join a section</h2>

        <div className="space-y-4">
          <label className="block">
            <span className="block text-xs font-medium text-folder-600 dark:text-folder-300 mb-1">
              Join code
            </span>
            <input
              type="text"
              placeholder="e.g. 7K2PQRX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border border-folder-200 dark:border-folder-700 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm font-mono uppercase outline-none focus:border-folder-500"
            />
            {error && <span className="block text-xs text-stamp-red mt-1">{error}</span>}
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm border border-folder-200 dark:border-folder-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full px-4 py-2 text-sm bg-folder-700 text-white hover:bg-folder-800 disabled:opacity-60"
          >
            {submitting ? "Joining…" : "Join section"}
          </button>
        </div>
      </form>
    </div>
  );
}
