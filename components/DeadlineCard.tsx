"use client";

import { useState } from "react";
import { Pin } from "lucide-react";
import type { Deadline } from "@/lib/types";
import {
  getUrgencyStage,
  getStageStyles,
  getRemainingLabel,
  subjectTagClass,
} from "@/lib/utils";
import DeadlineDetailModal from "./DeadlineDetailModal";

export default function DeadlineCard({
  deadline,
  canEdit,
  onEdit,
  onTogglePin,
  onToggleComplete,
  onViewHistory,
  onDelete,
  onRestore,
}: {
  deadline: Deadline;
  canEdit: boolean;
  onEdit: (d: Deadline) => void;
  onTogglePin: (d: Deadline) => void;
  onToggleComplete: (d: Deadline) => void;
  onViewHistory: (d: Deadline) => void;
  onDelete: (d: Deadline) => void;
  onRestore: (d: Deadline) => void;
}) {
  const stage = getUrgencyStage(deadline.due_date);
  const styles = getStageStyles(stage);
  const [detailOpen, setDetailOpen] = useState(false);
  const done = deadline.completed;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setDetailOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setDetailOpen(true);
        }}
        className={`w-full text-left flex rounded-card border border-folder-100 dark:border-folder-800 bg-surface dark:bg-surface-dark shadow-card hover:shadow-cardHover active:scale-[0.99] transition-all overflow-hidden cursor-pointer ${
          deadline.pinned ? "ring-1 ring-stamp-yellow/40" : ""
        } ${done ? "opacity-50" : ""}`}
      >
        {/* urgency tab edge — the "stamp" signature element */}
        <div className={`w-1.5 shrink-0 ${styles.edge}`} aria-hidden />

        {canEdit && (
          <div className="flex items-center pl-3">
            <button
              type="button"
              aria-label={done ? "Mark as not done" : "Mark as done"}
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(deadline);
              }}
              className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                done
                  ? "bg-folder-500 border-folder-500 text-white"
                  : "border-folder-300 dark:border-folder-600 hover:border-folder-500"
              }`}
            >
              {done && (
                <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M4 10.5l4 4 8-9"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        )}

        <div className="flex-1 min-w-0 p-3.5 sm:p-4">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${subjectTagClass(
                deadline.subject
              )}`}
            >
              {deadline.subject}
            </span>
            {deadline.pinned && (
              <span className="text-stamp-yellow shrink-0" title="Pinned">
                <Pin size={12} fill="currentColor" />
              </span>
            )}
            {deadline.deleted && (
              <span className="text-[10px] font-mono text-stamp-overdue shrink-0">deleted</span>
            )}
          </div>

          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3
                className={`font-display text-base sm:text-lg font-semibold leading-snug truncate ${
                  done ? "line-through" : ""
                }`}
              >
                {deadline.activity}
              </h3>
              {deadline.description && (
                <p className="text-xs sm:text-sm text-folder-500 dark:text-folder-400 mt-0.5 truncate">
                  {deadline.description}
                </p>
              )}
            </div>

            <div
              className={`shrink-0 rounded-lg border px-2 py-1 text-center font-mono ${styles.badge}`}
            >
              <div className="text-[9px] uppercase tracking-wide opacity-80 whitespace-nowrap">
                {styles.label}
              </div>
              <div className="text-xs sm:text-sm font-semibold whitespace-nowrap">
                {getRemainingLabel(deadline.due_date)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {detailOpen && (
        <DeadlineDetailModal
          deadline={deadline}
          canEdit={canEdit}
          onClose={() => setDetailOpen(false)}
          onEdit={onEdit}
          onTogglePin={onTogglePin}
          onToggleComplete={onToggleComplete}
          onViewHistory={onViewHistory}
          onDelete={onDelete}
          onRestore={onRestore}
        />
      )}
    </>
  );
}
