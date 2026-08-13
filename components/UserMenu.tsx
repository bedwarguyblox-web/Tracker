"use client";

import { useEffect, useState } from "react";
import { Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isAllowedEmail } from "@/lib/utils";
import SettingsModal from "./SettingsModal";

interface SessionUser {
  email: string;
  avatarUrl: string | null;
  fullName: string | null;
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#fff"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#fff"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 009 18z"
      />
      <path
        fill="#fff"
        d="M3.97 10.72A5.4 5.4 0 013.68 9c0-.6.1-1.18.29-1.72V4.95H.95A9 9 0 000 9c0 1.45.35 2.83.95 4.05l3.02-2.33z"
      />
      <path
        fill="#fff"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.95 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

function initialsFrom(email: string, fullName: string | null): string {
  if (fullName && fullName.trim()) {
    const parts = fullName.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  }
  return email[0]?.toUpperCase() || "?";
}

export default function UserMenu({
  onUserChange,
}: {
  onUserChange: (email: string | null) => void;
}) {
  const supabase = createClient();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applySession(authUser: any) {
    const email = authUser?.email ?? null;
    onUserChange(email);
    if (!email) {
      setUser(null);
      return;
    }
    setUser({
      email,
      avatarUrl: authUser?.user_metadata?.avatar_url ?? null,
      fullName: authUser?.user_metadata?.full_name ?? null,
    });
  }

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "mrc.pshs.edu.ph",
        },
      },
    });
  }

  async function signOut() {
    setMenuOpen(false);
    await supabase.auth.signOut();
  }

  if (!user || !isAllowedEmail(user.email)) {
    return (
      <button
        onClick={signIn}
        className="flex items-center gap-2 rounded-full bg-folder-500 text-white pl-3 pr-4 py-2 text-sm font-semibold hover:bg-folder-600 active:bg-folder-700 transition-colors shadow-sm"
      >
        <GoogleIcon />
        Sign in
      </button>
    );
  }

  const initials = initialsFrom(user.email, user.fullName);

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(true)}
        aria-label="Account menu"
        className="relative block rounded-full ring-2 ring-transparent hover:ring-folder-300 dark:hover:ring-folder-600 transition-all"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="h-9 w-9 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-folder-500 text-white flex items-center justify-center text-sm font-semibold">
            {initials}
          </div>
        )}
        {/* Discord-style "online" status dot */}
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-online border-2 border-paper dark:border-paper-dark" />
      </button>

      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-pop-in origin-top-right absolute right-4 top-16 sm:right-0 sm:top-12 w-64 rounded-xl bg-surface dark:bg-surface-dark border border-folder-100 dark:border-folder-800 shadow-cardHover overflow-hidden"
          >
            <div className="flex items-center gap-3 p-3 border-b border-folder-100 dark:border-folder-800">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-folder-500 text-white flex items-center justify-center text-sm font-semibold">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                {user.fullName && (
                  <div className="text-sm font-semibold truncate">{user.fullName}</div>
                )}
                <div className="text-xs font-mono text-folder-500 dark:text-folder-400 truncate">
                  {user.email}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setMenuOpen(false);
                setSettingsOpen(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-folder-50 dark:hover:bg-folder-900/40 transition-colors"
            >
              <Settings size={16} /> Settings
            </button>

            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-stamp-red hover:bg-stamp-red/10 transition-colors"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      )}

      {settingsOpen && (
        <SettingsModal
          email={user.email}
          fullName={user.fullName}
          avatarUrl={user.avatarUrl}
          onClose={() => setSettingsOpen(false)}
          onSignOut={signOut}
        />
      )}
    </div>
  );
}
