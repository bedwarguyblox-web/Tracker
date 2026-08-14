"use client";

import { useState } from "react";
import { X, Link2, Copy, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SectionInvite } from "@/lib/types";

export default function InviteLinkModal({
  open,
  onClose,
  sectionId,
  sectionName,
}: {
  open: boolean;
  onClose: () => void;
  sectionId: string;
  sectionName?: string;
}) {
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [singleUse, setSingleUse] = useState(false);
  const [invite, setInvite] = useState<SectionInvite | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleCreate() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("create_section_invite", {
      p_section_id: sectionId,
      p_expires_in_hours: expiresInHours,
      p_max_uses: singleUse ? 1 : null,
    });
    setBusy(false);
    if (rpcError || !data) {
      setError("Couldn't create an invite link. Please try again.");
      return;
    }
    setInvite(data as SectionInvite);
  }

  const link = invite ? `${window.location.origin}/join/${invite.token}` : "";

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up w-full sm:max-w-md rounded-t-2xl sm:rounded-card bg-surface dark:bg-surface-dark border border-folder-100 dark:border-folder-800 shadow-cardHover p-6"
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-xl font-semibold">Invite people</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-folder-400 hover:text-folder-700 dark:hover:text-folder-200 p-1 rounded-full hover:bg-folder-50 dark:hover:bg-folder-900"
          >
            <X size={20} />
          </button>
        </div>
        {sectionName && <p className="text-sm text-folder-500 mb-4">{sectionName}</p>}

        {!invite ? (
          <div className="space-y-4">
            <label className="block">
              <span className="block text-xs font-medium text-folder-600 dark:text-folder-300 mb-1">
                Link expires in
              </span>
              <select
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Number(e.target.value))}
                className="w-full rounded-lg border border-folder-200 dark:border-folder-700 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm"
              >
                <option value={1}>1 hour</option>
                <option value={24}>24 hours</option>
                <option value={168}>7 days</option>
                <option value={720}>30 days</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={singleUse}
                onChange={(e) => setSingleUse(e.target.checked)}
                className="rounded border-folder-300"
              />
              One-time use only
            </label>

            {error && <p className="text-xs text-stamp-red">{error}</p>}

            <button
              onClick={handleCreate}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-folder-500 text-white px-4 py-2.5 text-sm font-medium hover:bg-folder-600 disabled:opacity-60 transition-colors"
            >
              <Link2 size={16} />
              {busy ? "Creating…" : "Create invite link"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-folder-200 dark:border-folder-700 bg-folder-50 dark:bg-folder-900/40 px-3 py-2.5 text-xs font-mono break-all">
              {link}
            </div>
            <button
              onClick={handleCopy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-folder-500 text-white px-4 py-2.5 text-sm font-medium hover:bg-folder-600 transition-colors"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy link"}
            </button>
            <p className="text-xs text-folder-500 dark:text-folder-400">
              Expires {new Date(invite.expires_at).toLocaleString()}
              {invite.max_uses === 1 ? " · works once" : ""}
            </p>
            <button
              onClick={() => setInvite(null)}
              className="w-full text-xs text-folder-500 hover:text-folder-700 dark:hover:text-folder-300"
            >
              Create another link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
