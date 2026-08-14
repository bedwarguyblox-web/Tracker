"use client";

import { useEffect, useState } from "react";
import { LogOut, Shield, ShieldOff, UserMinus, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SectionMember } from "@/lib/types";
import InviteLinkModal from "./InviteLinkModal";

export default function SectionMembersList({
  open,
  onClose,
  activeSectionId,
  sectionName,
  userEmail,
  isAdmin,
  onLeft,
}: {
  open: boolean;
  onClose: () => void;
  activeSectionId: string | null;
  sectionName?: string;
  userEmail: string | null;
  isAdmin: boolean;
  onLeft: () => void;
}) {
  const [members, setMembers] = useState<SectionMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const supabase = createClient();

  async function loadMembers() {
    if (!activeSectionId) return;
    setLoading(true);
    const { data } = await supabase
      .from("section_members")
      .select("*")
      .eq("section_id", activeSectionId)
      .order("joined_at", { ascending: true });
    setMembers((data as SectionMember[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    if (!open || !activeSectionId) return;
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeSectionId]);

  if (!open) return null;

  const adminCount = members.filter((m) => m.role === "admin").length;

  async function handleLeave() {
    if (!activeSectionId || !userEmail) return;
    if (
      !window.confirm(
        `Leave "${sectionName || "this section"}"? You'll need a new invite to come back.`
      )
    ) {
      return;
    }
    setLeaving(true);
    await supabase
      .from("section_members")
      .delete()
      .eq("section_id", activeSectionId)
      .eq("user_email", userEmail);
    setLeaving(false);
    onLeft();
  }

  async function handleToggleAdmin(m: SectionMember) {
    if (!activeSectionId) return;
    const nextRole = m.role === "admin" ? "member" : "admin";
    if (m.role === "admin" && adminCount <= 1) {
      window.alert("This is the last admin — promote someone else first.");
      return;
    }
    setBusyEmail(m.user_email);
    await supabase
      .from("section_members")
      .update({ role: nextRole })
      .eq("section_id", activeSectionId)
      .eq("user_email", m.user_email);
    setBusyEmail(null);
    loadMembers();
  }

  async function handleKick(m: SectionMember) {
    if (!activeSectionId) return;
    if (!window.confirm(`Remove ${m.user_email} from this section?`)) return;
    setBusyEmail(m.user_email);
    await supabase
      .from("section_members")
      .delete()
      .eq("section_id", activeSectionId)
      .eq("user_email", m.user_email);
    setBusyEmail(null);
    loadMembers();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-card bg-surface dark:bg-surface-dark border border-folder-100 dark:border-folder-800 shadow-cardHover p-6"
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

        {isAdmin && (
          <button
            onClick={() => setInviteOpen(true)}
            className="mb-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-folder-500 text-white px-4 py-2.5 text-sm font-medium hover:bg-folder-600 transition-colors"
          >
            <Link2 size={16} />
            Create invite link
          </button>
        )}

        {loading && <p className="text-sm text-folder-500">Loading…</p>}

        {!loading && members.length === 0 && (
          <p className="text-sm text-folder-500">No members yet.</p>
        )}

        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="rounded-lg border border-folder-100 dark:border-folder-800 px-3 py-2.5 text-sm flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono truncate">{m.user_email}</span>
                  {m.user_email === userEmail && (
                    <span className="text-[10px] uppercase text-folder-400 shrink-0">you</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {m.role === "admin" && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase text-folder-500 dark:text-folder-400">
                      <Shield size={10} /> Admin
                    </span>
                  )}
                  <span className="text-[10px] text-folder-400">
                    joined {new Date(m.joined_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {isAdmin && m.user_email !== userEmail && (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleAdmin(m)}
                    disabled={busyEmail === m.user_email}
                    title={m.role === "admin" ? "Remove admin" : "Make admin"}
                    aria-label={m.role === "admin" ? "Remove admin" : "Make admin"}
                    className="p-1.5 rounded-full text-folder-400 hover:text-folder-700 hover:bg-folder-50 dark:hover:bg-folder-900 disabled:opacity-50"
                  >
                    {m.role === "admin" ? <ShieldOff size={15} /> : <Shield size={15} />}
                  </button>
                  <button
                    onClick={() => handleKick(m)}
                    disabled={busyEmail === m.user_email}
                    title="Remove from section"
                    aria-label="Remove from section"
                    className="p-1.5 rounded-full text-folder-400 hover:text-stamp-red hover:bg-stamp-red/10 disabled:opacity-50"
                  >
                    <UserMinus size={15} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>

        <button
          onClick={handleLeave}
          disabled={leaving}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full border border-stamp-red/40 text-stamp-red px-4 py-2.5 text-sm font-medium hover:bg-stamp-red/10 transition-colors disabled:opacity-60"
        >
          <LogOut size={16} />
          {leaving ? "Leaving…" : "Leave this section"}
        </button>
      </div>

      {activeSectionId && (
        <InviteLinkModal
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          sectionId={activeSectionId}
          sectionName={sectionName}
        />
      )}
    </div>
  );
}
