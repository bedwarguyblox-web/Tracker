"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isAllowedEmail } from "@/lib/utils";

export default function AuthButton({
  onUserChange,
}: {
  onUserChange: (email: string | null) => void;
}) {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const e = data.session?.user.email ?? null;
      setEmail(e);
      onUserChange(e);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const e = session?.user.email ?? null;
      setEmail(e);
      onUserChange(e);
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    await supabase.auth.signOut();
  }

  if (email && isAllowedEmail(email)) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-xs font-mono text-folder-600 dark:text-folder-300">
          {email}
        </span>
        <button
          onClick={signOut}
          className="rounded-full border border-folder-200 dark:border-folder-700 px-3 py-1.5 text-sm hover:bg-folder-50 dark:hover:bg-folder-900 transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={signIn}
      className="rounded-full bg-folder-700 text-white px-4 py-1.5 text-sm font-medium hover:bg-folder-800 transition-colors"
    >
      Sign in with school Google
    </button>
  );
}
