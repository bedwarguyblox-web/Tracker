"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Section } from "@/lib/types";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
const CODE_LENGTH = 7;
const MAX_ATTEMPTS = 5;

function generateJoinCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return code;
}

export default function CreateSectionModal({
  open,
  onClose,
  onCreated,
  userEmail,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (section: Section) => void;
  userEmail: string | null;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!userEmail) return;
    if (!name.trim()) {
      setError("Section name is required.");
      return;
    }
    setError("");
    setSubmitting(true);
    const supabase = createClient();

    try {
      let created: Section | null = null;

      for (let attempt = 0; attempt < MAX_ATTEMPTS && !created; attempt++) {
        const join_code = generateJoinCode();
        const { data, error: insertError } = await supabase
          .from("sections")
          .insert({ name: name.trim(), join_code, created_by: userEmail })
          .select("*")
          .single();

        if (!insertError && data) {
          created = data as Section;
        } else if (insertError && insertError.code !== "23505") {
          // Not a unique-violation (duplicate join_code) — bail out.
          throw insertError;
        }
        // 23505 = duplicate join_code, loop again with a fresh code.
      }

      if (!created) {
        setError("Couldn't generate a unique join code. Please try again.");
        return;
      }

      // Membership for the creator is now added automatically by a
      // database trigger (auto_join_creator) — direct client inserts
      // into section_members are blocked by RLS, since joining is only
      // allowed through a verified code or that trigger.

      setName("");
      onCreated(created);
      onClose();
    } catch (err) {
      setError("Something went wrong creating the section. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 dark:bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-card bg-surface dark:bg-surface-dark border border-folder-100 dark:border-folder-800 shadow-cardHover p-6"
      >
        <h2 className="font-display text-xl font-semibold mb-4">Create a section</h2>

        <div className="space-y-4">
          <label className="block">
            <span className="block text-xs font-medium text-folder-600 dark:text-folder-300 mb-1">
              Section name
            </span>
            <input
              type="text"
              placeholder="e.g. Grade 11 - Sampaguita"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-folder-200 dark:border-folder-700 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none focus:border-folder-500"
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
            {submitting ? "Creating…" : "Create section"}
          </button>
        </div>
      </form>
    </div>
  );
}
