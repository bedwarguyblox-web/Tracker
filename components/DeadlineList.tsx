"use client";

import type { Deadline } from "@/lib/types";
import DeadlineCard from "./DeadlineCard";

export default function DeadlineList({
  deadlines,
  canEdit,
  onEdit,
  onTogglePin,
  onToggleComplete,
  onViewHistory,
  onDelete,
  onRestore,
  emptyMessage,
}: {
  deadlines: Deadline[];
  canEdit: boolean;
  onEdit: (d: Deadline) => void;
  onTogglePin: (d: Deadline) => void;
  onToggleComplete: (d: Deadline) => void;
  onViewHistory: (d: Deadline) => void;
  onDelete: (d: Deadline) => void;
  onRestore: (d: Deadline) => void;
  emptyMessage: string;
}) {
  if (deadlines.length === 0) {
    return (
      <div className="animate-fade-in rounded-card border border-dashed border-folder-200 dark:border-folder-700 py-14 text-center text-folder-500">
        <p className="font-display text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {deadlines.map((d, i) => (
        <div
          key={d.id}
          className="animate-card-in"
          style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
        >
          <DeadlineCard
            deadline={d}
            canEdit={canEdit}
            onEdit={onEdit}
            onTogglePin={onTogglePin}
            onToggleComplete={onToggleComplete}
            onViewHistory={onViewHistory}
            onDelete={onDelete}
            onRestore={onRestore}
          />
        </div>
      ))}
    </div>
  );
}
