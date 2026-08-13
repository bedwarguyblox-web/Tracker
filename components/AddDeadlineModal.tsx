"use client";

import { useEffect, useState } from "react";
import type { Deadline, Priority } from "@/lib/types";

export interface DeadlineFormValues {
  subject: string;
  activity: string;
  description: string;
  due_date: string; // datetime-local value
  priority: Priority;
  attachment_url: string;
  pinned: boolean;
}

export default function AddDeadlineModal({
  open,
  onClose,
  onSubmit,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: DeadlineFormValues) => Promise<void>;
  editing: Deadline | null;
}) {
  const [values, setValues] = useState<DeadlineFormValues>({
    subject: "",
    activity: "",
    description: "",
    due_date: "",
    priority: "normal",
    attachment_url: "",
    pinned: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editing) {
      setValues({
        subject: editing.subject,
        activity: editing.activity,
        description: editing.description || "",
        due_date: toLocalInputValue(editing.due_date),
        priority: editing.priority,
        attachment_url: editing.attachment_url || "",
        pinned: editing.pinned,
      });
    } else {
      setValues({
        subject: "",
        activity: "",
        description: "",
        due_date: "",
        priority: "normal",
        attachment_url: "",
        pinned: false,
      });
    }
    setErrors({});
  }, [editing, open]);

  if (!open) return null;

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!values.subject.trim()) e.subject = "Subject is required.";
    if (!values.activity.trim()) e.activity = "Activity name is required.";
    if (!values.due_date) e.due_date = "Due date is required.";
    if (
      values.attachment_url &&
      !/^https?:\/\/.+/i.test(values.attachment_url.trim())
    ) {
      e.attachment_url = "Attachment link must start with http(s)://";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
      onClose();
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
        <h2 className="font-display text-xl font-semibold mb-4">
          {editing ? "Edit deadline" : "Add a deadline"}
        </h2>

        <div className="space-y-4">
          <Field label="Due date" error={errors.due_date}>
            <input
              type="datetime-local"
              value={values.due_date}
              onChange={(e) => setValues((v) => ({ ...v, due_date: e.target.value }))}
              className={inputClass}
            />
          </Field>

          <Field label="Subject" error={errors.subject}>
            <input
              type="text"
              placeholder="e.g. Physics"
              value={values.subject}
              onChange={(e) => setValues((v) => ({ ...v, subject: e.target.value }))}
              className={inputClass}
            />
          </Field>

          <Field label="Activity name" error={errors.activity}>
            <input
              type="text"
              placeholder="e.g. Lab report 3"
              value={values.activity}
              onChange={(e) => setValues((v) => ({ ...v, activity: e.target.value }))}
              className={inputClass}
            />
          </Field>

          <Field label="Description">
            <textarea
              rows={3}
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              className={inputClass}
            />
          </Field>

          <Field label="Priority (optional)">
            <select
              value={values.priority}
              onChange={(e) =>
                setValues((v) => ({ ...v, priority: e.target.value as Priority }))
              }
              className={inputClass}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </Field>

          <Field label="Attachment link (optional)" error={errors.attachment_url}>
            <input
              type="url"
              placeholder="https://drive.google.com/…"
              value={values.attachment_url}
              onChange={(e) => setValues((v) => ({ ...v, attachment_url: e.target.value }))}
              className={inputClass}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.pinned}
              onChange={(e) => setValues((v) => ({ ...v, pinned: e.target.checked }))}
              className="rounded border-folder-300"
            />
            Pin this deadline
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
            {submitting ? "Saving…" : editing ? "Save changes" : "Add deadline"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-folder-200 dark:border-folder-700 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none focus:border-folder-500";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-folder-600 dark:text-folder-300 mb-1">
        {label}
      </span>
      {children}
      {error && <span className="block text-xs text-stamp-red mt-1">{error}</span>}
    </label>
  );
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
