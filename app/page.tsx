"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { differenceInCalendarDays, isPast } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Deadline, DeadlineHistoryEntry, TabKey, SortKey } from "@/lib/types";
import { isAllowedEmail } from "@/lib/utils";
import Header from "@/components/Header";
import DashboardStats from "@/components/DashboardStats";
import TabsNav from "@/components/TabsNav";
import SearchFilterBar from "@/components/SearchFilterBar";
import DeadlineList from "@/components/DeadlineList";
import AddDeadlineModal, { DeadlineFormValues } from "@/components/AddDeadlineModal";
import HistoryModal from "@/components/HistoryModal";
import { requestNotificationPermission, startNotificationLoop } from "@/lib/notifications";

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [tab, setTab] = useState<TabKey>("upcoming");
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("closest");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Deadline | null>(null);

  const [historyTarget, setHistoryTarget] = useState<Deadline | null>(null);
  const [historyEntries, setHistoryEntries] = useState<DeadlineHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const canEdit = isAllowedEmail(userEmail);

  const fetchDeadlines = useCallback(async () => {
    const { data, error } = await supabase
      .from("deadlines")
      .select("*")
      .order("due_date", { ascending: true });
    if (!error && data) setDeadlines(data as Deadline[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchDeadlines();

    const channel = supabase
      .channel("deadlines-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deadlines" },
        () => fetchDeadlines()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDeadlines, supabase]);

  // Notifications: ask for permission on first meaningful interaction,
  // then re-check milestones periodically while the tab is open.
  useEffect(() => {
    const stop = startNotificationLoop(() => deadlines);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlines.length]);

  async function ensureNotificationPermission() {
    await requestNotificationPermission();
  }

  const subjects = useMemo(
    () => Array.from(new Set(deadlines.map((d) => d.subject))).sort(),
    [deadlines]
  );

  const filtered = useMemo(() => {
    let list = deadlines;

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (d) =>
          d.subject.toLowerCase().includes(q) ||
          d.activity.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q)
      );
    }
    if (subjectFilter) list = list.filter((d) => d.subject === subjectFilter);
    if (priorityFilter) list = list.filter((d) => d.priority === priorityFilter);

    const now = new Date();

    if (tab === "deleted") {
      list = list.filter((d) => d.deleted);
    } else {
      // Deleted items never show up in the normal working tabs, they
      // only live in the Deleted tab (and remain in edit history).
      list = list.filter((d) => !d.deleted);

      switch (tab) {
        case "upcoming":
          list = list.filter((d) => differenceInCalendarDays(new Date(d.due_date), now) >= 0);
          break;
        case "today":
          list = list.filter((d) => differenceInCalendarDays(new Date(d.due_date), now) === 0);
          break;
        case "pinned":
          list = list.filter((d) => d.pinned);
          break;
        case "overdue":
          list = list.filter(
            (d) =>
              isPast(new Date(d.due_date)) && differenceInCalendarDays(new Date(d.due_date), now) < 0
          );
          break;
        case "history":
          list = list.filter((d) => d.edit_count > 0);
          break;
      }
    }

    const sorted = [...list].sort((a, b) => {
      switch (sort) {
        case "furthest":
          return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
        case "recent":
          return (
            new Date(b.last_edited_at || b.created_at).getTime() -
            new Date(a.last_edited_at || a.created_at).getTime()
          );
        case "subject":
          return a.subject.localeCompare(b.subject);
        default:
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
    });

    // Pinned items float to the top of Upcoming, as specified.
    if (tab === "upcoming") {
      sorted.sort((a, b) => Number(b.pinned) - Number(a.pinned));
    }

    return sorted;
  }, [deadlines, query, subjectFilter, priorityFilter, tab, sort]);

  const counts = useMemo(() => {
    const now = new Date();
    const active = deadlines.filter((d) => !d.deleted);
    return {
      upcoming: active.filter((d) => differenceInCalendarDays(new Date(d.due_date), now) >= 0)
        .length,
      today: active.filter((d) => differenceInCalendarDays(new Date(d.due_date), now) === 0)
        .length,
      pinned: active.filter((d) => d.pinned).length,
      overdue: active.filter(
        (d) => isPast(new Date(d.due_date)) && differenceInCalendarDays(new Date(d.due_date), now) < 0
      ).length,
      history: active.filter((d) => d.edit_count > 0).length,
      deleted: deadlines.filter((d) => d.deleted).length,
    } as Record<TabKey, number>;
  }, [deadlines]);

  async function handleCreateOrUpdate(values: DeadlineFormValues) {
    if (!userEmail) return;
    const payload = {
      subject: values.subject.trim(),
      activity: values.activity.trim(),
      description: values.description.trim(),
      due_date: new Date(values.due_date).toISOString(),
      priority: values.priority,
      attachment_url: values.attachment_url.trim() || null,
      pinned: values.pinned,
    };

    if (editing) {
      await supabase
        .from("deadlines")
        .update({ ...payload, last_edited_by: userEmail })
        .eq("id", editing.id);
    } else {
      await supabase.from("deadlines").insert({
        ...payload,
        created_by: userEmail,
      });
    }
    setEditing(null);
    fetchDeadlines();
  }

  async function handleTogglePin(d: Deadline) {
    if (!userEmail) return;
    await supabase
      .from("deadlines")
      .update({ pinned: !d.pinned, last_edited_by: userEmail })
      .eq("id", d.id);
    fetchDeadlines();
  }

  async function handleDelete(d: Deadline) {
    if (!userEmail) return;
    await supabase
      .from("deadlines")
      .update({ deleted: true, deleted_by: userEmail })
      .eq("id", d.id);
    fetchDeadlines();
  }

  async function handleRestore(d: Deadline) {
    if (!userEmail) return;
    await supabase
      .from("deadlines")
      .update({ deleted: false, deleted_by: userEmail })
      .eq("id", d.id);
    fetchDeadlines();
  }

  async function openHistory(d: Deadline) {
    setHistoryTarget(d);
    setHistoryLoading(true);
    const { data } = await supabase
      .from("deadline_history")
      .select("*")
      .eq("deadline_id", d.id)
      .order("edited_at", { ascending: false });
    setHistoryEntries((data as DeadlineHistoryEntry[]) || []);
    setHistoryLoading(false);
  }

  const emptyMessages: Record<TabKey, string> = {
    upcoming: "Nothing due yet — you're all caught up.",
    today: "Nothing due today.",
    pinned: "No pinned deadlines yet.",
    overdue: "No overdue deadlines. Nice.",
    history: "No edits have been made yet.",
    deleted: "Nothing's been deleted — nice and clean.",
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Header onUserChange={setUserEmail} />

        <div className="mb-5">
          <DashboardStats deadlines={deadlines} />
        </div>

        <div className="mb-4">
          <TabsNav active={tab} onChange={setTab} counts={counts} />
        </div>

        <div className="mb-5">
          <SearchFilterBar
            query={query}
            onQuery={setQuery}
            subjects={subjects}
            subjectFilter={subjectFilter}
            onSubjectFilter={setSubjectFilter}
            priorityFilter={priorityFilter}
            onPriorityFilter={setPriorityFilter}
            sort={sort}
            onSort={setSort}
          />
        </div>

        {loading ? (
          <p className="text-sm text-folder-500 text-center py-14">Loading deadlines…</p>
        ) : (
          <DeadlineList
            deadlines={filtered}
            canEdit={canEdit}
            onEdit={(d) => {
              setEditing(d);
              setModalOpen(true);
            }}
            onTogglePin={handleTogglePin}
            onViewHistory={openHistory}
            onDelete={handleDelete}
            onRestore={handleRestore}
            emptyMessage={emptyMessages[tab]}
          />
        )}

        <div className="h-24" />
      </div>

      {canEdit && (
        <button
          onClick={async () => {
            await ensureNotificationPermission();
            setEditing(null);
            setModalOpen(true);
          }}
          aria-label="Add a deadline"
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 rounded-full bg-folder-700 text-white w-14 h-14 text-2xl font-light shadow-cardHover hover:bg-folder-800 transition-colors flex items-center justify-center"
        >
          +
        </button>
      )}

      <AddDeadlineModal
        open={modalOpen}
        editing={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleCreateOrUpdate}
      />

      <HistoryModal
        deadline={historyTarget}
        entries={historyEntries}
        loading={historyLoading}
        onClose={() => setHistoryTarget(null)}
      />
    </div>
  );
}
