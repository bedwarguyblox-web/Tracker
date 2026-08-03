"use client";

import AuthButton from "./AuthButton";
import ThemeToggle from "./ThemeToggle";

export default function Header({
  onUserChange,
}: {
  onUserChange: (email: string | null) => void;
}) {
  return (
    <header className="flex items-center justify-between gap-4 py-5">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
          What&apos;s due next
        </h1>
        <p className="text-sm text-folder-500 dark:text-folder-400">
          MRC shared deadline tracker — sorted by urgency, not by month.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <AuthButton onUserChange={onUserChange} />
      </div>
    </header>
  );
}
