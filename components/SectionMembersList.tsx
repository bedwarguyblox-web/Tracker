"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SectionMember } from "@/lib/types";

export default function SectionMembersList({
  open,
  onClose,
  activeSectionId,
  sectionName,
}: {
  open: boolean;
  onClose: () => void;
  activeSectionId: string | null;
  sectionName?: string;
}) {
  const [members, setMembers] = useState<SectionMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !activeSectionId) return;
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("section_members")
      .select("*")
      .eq("section_id", activeSectionId)
      .order("joined_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) {
          setMembers((data as SectionMember[]) || []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, activeSectionId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 dark:bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-card bg-surface dark:bg-surface-dark border border-folder-100 dark:border-folder-800 shadow-cardHover p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Members</h2>
            {sectionName && <p className="text-sm text-folder-500">{sectionName}</p>}
          </div>
          <button onClick={onClose} className="text-folder-500 hover:text-folder-800 text-sm">
            Close
          </button>
        </div>

        {loading && <p className="text-sm text-folder-500">Loading…</p>}

        {!loading && members.length === 0 && (
          <p className="text-sm text-folder-500">No members yet.</p>
        )}

        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="rounded-lg border border-folder-100 dark:border-folder-800 px-3 py-2 text-sm font-mono flex items-center justify-between"
            >
              <span>{m.user_email}</span>
              <span className="text-xs text-folder-400">
                {new Date(m.joined_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
