"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Trash2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SectionMessage } from "@/lib/types";

export default function SectionChat({
  sectionId,
  sectionName,
  userEmail,
  isAdmin,
  onBack,
}: {
  sectionId: string;
  sectionName?: string;
  userEmail: string | null;
  isAdmin: boolean;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<SectionMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("section_messages")
        .select("*")
        .eq("section_id", sectionId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!cancelled) {
        setMessages((data as SectionMessage[]) || []);
        setLoading(false);
      }
    }
    load();

    const channel = supabase
      .channel(`section-chat-${sectionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "section_messages", filter: `section_id=eq.${sectionId}` },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !userEmail) return;
    setSending(true);
    setDraft("");
    await supabase.from("section_messages").insert({
      section_id: sectionId,
      sender_email: userEmail,
      body,
    });
    setSending(false);
  }

  async function handleDelete(id: string) {
    await supabase.from("section_messages").delete().eq("id", id);
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-1rem)] sm:h-[75vh]">
      <div className="flex items-center gap-2 pb-3 border-b border-folder-100 dark:border-folder-800">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-folder-50 dark:hover:bg-folder-900 text-folder-500"
          aria-label="Back to deadlines"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <div className="font-display text-lg font-semibold truncate">
            {sectionName || "Chat"}
          </div>
          <div className="text-xs text-folder-500 dark:text-folder-400">Section chat</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-2">
        {loading && <p className="text-sm text-folder-500 text-center py-8">Loading messages…</p>}

        {!loading && messages.length === 0 && (
          <p className="text-sm text-folder-500 text-center py-8">
            No messages yet — say hi to your section.
          </p>
        )}

        {messages.map((m) => {
          const mine = m.sender_email === userEmail;
          return (
            <div
              key={m.id}
              className={`animate-card-in group flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                {!mine && (
                  <span className="text-[10px] font-mono text-folder-400 mb-0.5 px-1">
                    {m.sender_email}
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  {mine && (isAdmin || mine) && (
                    <button
                      onClick={() => handleDelete(m.id)}
                      aria-label="Delete message"
                      className="opacity-0 group-hover:opacity-100 text-folder-400 hover:text-stamp-red transition-opacity p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm break-words whitespace-pre-wrap ${
                      mine
                        ? "bg-folder-500 text-white rounded-br-sm"
                        : "bg-folder-50 dark:bg-folder-900/50 text-ink dark:text-ink-dark rounded-bl-sm"
                    }`}
                  >
                    {m.body}
                  </div>
                  {!mine && isAdmin && (
                    <button
                      onClick={() => handleDelete(m.id)}
                      aria-label="Delete message"
                      className="opacity-0 group-hover:opacity-100 text-folder-400 hover:text-stamp-red transition-opacity p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-folder-400 mt-0.5 px-1">
                  {new Date(m.created_at).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 pt-2 border-t border-folder-100 dark:border-folder-800">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message this section…"
          maxLength={2000}
          className="flex-1 rounded-full border border-folder-200 dark:border-folder-700 bg-white/70 dark:bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-folder-500"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          aria-label="Send"
          className="shrink-0 rounded-full bg-folder-500 text-white w-10 h-10 flex items-center justify-center hover:bg-folder-600 disabled:opacity-50 transition-colors"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
