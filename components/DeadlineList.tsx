"use client";

import type { Deadline } from "@/lib/types";
import DeadlineCard from "./DeadlineCard";

export default function DeadlineList({
  deadlines,
  canEdit,
  onEdit,
  onTogglePin,
  onViewHistory,
  emptyMessage,
}: {
  deadlines: Deadline[];
  canEdit: boolean;
  onEdit: (d: Deadline) => void;
  onTogglePin: (d: Deadline) => void;
  onViewHistory: (d: Deadline) => void;
  emptyMessage: string;
}) {
  if (deadlines.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-folder-200 dark:border-folder-700 py-14 text-center text-folder-500">
        <p className="font-display text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {deadlines.map((d) => (
        <DeadlineCard
          key={d.id}
          deadline={d}
          canEdit={canEdit}
          onEdit={onEdit}
          onTogglePin={onTogglePin}
          onViewHistory={onViewHistory}
        />
      ))}
    </div>
  );
}
