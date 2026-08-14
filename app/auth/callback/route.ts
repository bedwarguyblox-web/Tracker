import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const destination = next && next.startsWith("/") ? `${origin}${next}` : origin;

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const email = data.session.user.email;

      // Server-side enforcement: this is the real gate. Client-side
      // domain checks are only a UX convenience and are never trusted
      // on their own — the RLS policies in schema.sql are what actually
      // stop a non-school account from writing data even if this check
      // were somehow skipped.
      if (!isAllowedEmail(email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(
          `${origin}/?authError=${encodeURIComponent(
            "Only @mrc.pshs.edu.ph school accounts may sign in."
          )}`
        );
      }

      return NextResponse.redirect(destination);
    }
  }

  return NextResponse.redirect(`${origin}/?authError=Sign-in failed. Please try again.`);
}
