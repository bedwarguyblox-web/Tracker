"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("mrc-theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="rounded-full border border-folder-200 dark:border-folder-700 px-3 py-1.5 text-sm font-body text-ink dark:text-ink-dark hover:bg-folder-50 dark:hover:bg-folder-900 transition-colors"
    >
      {isDark ? "☾ Dark" : "☀ Light"}
    </button>
  );
}
