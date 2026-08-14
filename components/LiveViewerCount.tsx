"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LiveViewerCount({ userEmail }: { userEmail: string | null }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    // A random-ish key per tab so the same person open in two tabs
    // counts as two "viewing now" — matches what people intuitively
    // expect from a live viewer count.
    const clientKey =
      userEmail || `anon-${Math.random().toString(36).slice(2)}`;

    const channel = supabase.channel("site-presence", {
      config: { presence: { key: clientKey } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userEmail]);

  if (count === null) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-6 text-xs text-folder-500 dark:text-folder-400">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-online opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-online" />
      </span>
      {count === 1 ? "1 person" : `${count} people`} viewing right now
    </div>
  );
}
