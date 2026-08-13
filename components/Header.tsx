"use client";

import UserMenu from "./UserMenu";

export default function Header({
  onUserChange,
  sectionName,
  onBack,
  onShowMembers,
}: {
  onUserChange: (email: string | null) => void;
  sectionName?: string | null;
  onBack?: () => void;
  onShowMembers?: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-4 py-5">
      <div className="min-w-0">
        {sectionName ? (
          <div className="flex items-center gap-2 flex-wrap">
            {onBack && (
              <button
                onClick={onBack}
                className="text-sm text-folder-500 hover:text-folder-800 dark:hover:text-folder-200"
              >
                ← Sections
              </button>
            )}
            <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight truncate">
              {sectionName}
            </h1>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
              What&apos;s due next
            </h1>
            <p className="text-sm text-folder-500 dark:text-folder-400">
              MRC shared deadline tracker — sorted by urgency, not by month.
            </p>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {sectionName && onShowMembers && (
          <button
            onClick={onShowMembers}
            className="rounded-full border border-folder-200 dark:border-folder-700 px-3 py-1.5 text-sm hover:bg-folder-50 dark:hover:bg-folder-900 transition-colors"
          >
            Members
          </button>
        )}
        <UserMenu onUserChange={onUserChange} />
      </div>
    </header>
  );
}
