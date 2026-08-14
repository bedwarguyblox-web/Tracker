"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAllowedEmail } from "@/lib/utils";

type Status = "checking" | "needs-sign-in" | "joining" | "success" | "error";

export default function JoinInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.token === "string" ? params.token : "";
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState("");
  const [sectionName, setSectionName] = useState("");
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user.email;

      if (!email || !isAllowedEmail(email)) {
        if (!cancelled) setStatus("needs-sign-in");
        return;
      }

      if (!cancelled) setStatus("joining");
      const { data: section, error } = await supabase.rpc("join_section_by_invite", {
        p_token: token,
      });

      if (cancelled) return;

      if (error || !section) {
        setStatus("error");
        setMessage(error?.message || "This invite link didn't work.");
        return;
      }

      setSectionName(section.name);
      setStatus("success");
      setTimeout(() => router.push("/"), 1200);
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/join/${token}`,
        queryParams: {
          hd: process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "mrc.pshs.edu.ph",
        },
      },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <img src="/logo.png" alt="" className="h-16 w-16 mx-auto mb-4 object-contain" />

        {status === "checking" && (
          <p className="text-sm text-folder-500">Checking your invite…</p>
        )}

        {status === "needs-sign-in" && (
          <>
            <h1 className="font-display text-xl font-semibold mb-2">You're invited</h1>
            <p className="text-sm text-folder-500 dark:text-folder-400 mb-5">
              Sign in with your school account to join.
            </p>
            <button
              onClick={signIn}
              className="rounded-full bg-folder-500 text-white px-5 py-2.5 text-sm font-semibold hover:bg-folder-600 transition-colors"
            >
              Sign in with school Google
            </button>
          </>
        )}

        {status === "joining" && <p className="text-sm text-folder-500">Joining…</p>}

        {status === "success" && (
          <>
            <h1 className="font-display text-xl font-semibold mb-2">You're in!</h1>
            <p className="text-sm text-folder-500 dark:text-folder-400">
              Joined {sectionName} — taking you there now…
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="font-display text-xl font-semibold mb-2 text-stamp-red">
              Couldn't join
            </h1>
            <p className="text-sm text-folder-500 dark:text-folder-400 mb-5">{message}</p>
            <button
              onClick={() => router.push("/")}
              className="rounded-full border border-folder-200 dark:border-folder-700 px-5 py-2.5 text-sm hover:bg-folder-50 dark:hover:bg-folder-900"
            >
              Go to homepage
            </button>
          </>
        )}
      </div>
    </div>
  );
}
