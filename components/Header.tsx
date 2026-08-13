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
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo.jpg"
              alt="Philippine Science High School — MIMAROPA Region Campus"
              className="h-11 w-11 sm:h-14 sm:w-14 object-contain shrink-0"
            />
            <div className="min-w-0">
              <div className="font-display text-base sm:text-lg font-semibold leading-tight truncate">
                Philippine Science High School
              </div>
              <div className="text-xs sm:text-sm text-folder-500 dark:text-folder-400 leading-tight truncate">
                MIMAROPA Region Campus
              </div>
            </div>
          </div>
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
