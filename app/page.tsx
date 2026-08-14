"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { differenceInCalendarDays, isPast } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Deadline, DeadlineHistoryEntry, TabKey, SortKey, Section } from "@/lib/types";
import { isAllowedEmail } from "@/lib/utils";
import Header from "@/components/Header";
import DashboardStats from "@/components/DashboardStats";
import TabsNav from "@/components/TabsNav";
import SearchFilterBar from "@/components/SearchFilterBar";
import DeadlineList from "@/components/DeadlineList";
import AddDeadlineModal, { DeadlineFormValues } from "@/components/AddDeadlineModal";
import HistoryModal from "@/components/HistoryModal";
import SectionDashboard, { SectionWithCount } from "@/components/SectionDashboard";
import CreateSectionModal from "@/components/CreateSectionModal";
import JoinSectionModal from "@/components/JoinSectionModal";
import SectionMembersList from "@/components/SectionMembersList";
import ManageSubjectsModal from "@/components/ManageSubjectsModal";
import { requestNotificationPermission, startNotificationLoop, registerServiceWorker } from "@/lib/notifications";

type ViewKey = "dashboard" | "section";

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const canEdit = isAllowedEmail(userEmail);

  // ---- Section navigation ----
  const [view, setView] = useState<ViewKey>("dashboard");
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const activeSectionId = activeSection?.id ?? null;

  const [mySections, setMySections] = useState<SectionWithCount[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  const [createSectionOpen, setCreateSectionOpen] = useState(false);
  const [joinSectionOpen, setJoinSectionOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [manageSubjectsOpen, setManageSubjectsOpen] = useState(false);

  const fetchMySections = useCallback(async () => {
    if (!userEmail) {
      setMySections([]);
      setSectionsLoading(false);
      return;
    }
    setSectionsLoading(true);

    const { data: memberships } = await supabase
      .from("section_members")
      .select("section_id, sections(*)")
      .eq("user_email", userEmail);

    const sections: Section[] = (memberships || [])
      .map((m: any) => m.sections)
      .filter(Boolean);

    if (sections.length === 0) {
      setMySections([]);
      setSectionsLoading(false);
      return;
    }

    const ids = sections.map((s) => s.id);
    const { data: sectionDeadlines } = await supabase
      .from("deadlines")
      .select("section_id, due_date")
      .in("section_id", ids)
      .eq("deleted", false);

    const now = new Date();
    const countsBySection: Record<string, number> = {};
    for (const d of sectionDeadlines || []) {
      const days = differenceInCalendarDays(new Date(d.due_date), now);
      if (days >= 0 && days <= 7) {
        countsBySection[d.section_id] = (countsBySection[d.section_id] || 0) + 1;
      }
    }

    setMySections(
      sections.map((s) => ({ ...s, dueSoonCount: countsBySection[s.id] || 0 }))
    );
    setSectionsLoading(false);
  }, [supabase, userEmail]);

  useEffect(() => {
    fetchMySections();
  }, [fetchMySections]);

  function goToDashboard() {
    setView("dashboard");
    setActiveSection(null);
  }

  function goToSection(section: Section) {
    setActiveSection(section);
    setView("section");
  }

  async function handleLeaveSection() {
    setMembersOpen(false);
    goToDashboard();
    await fetchMySections();
  }

  // ---- Section-scoped deadlines (existing app body) ----
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<TabKey>(() => {
    if (typeof window === "undefined") return "upcoming";
    return (localStorage.getItem("mrc-default-tab") as TabKey) || "upcoming";
  });
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sort, setSort] = useState<SortKey>(() => {
    if (typeof window === "undefined") return "closest";
    return (localStorage.getItem("mrc-default-sort") as SortKey) || "closest";
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Deadline | null>(null);

  const [historyTarget, setHistoryTarget] = useState<Deadline | null>(null);
  const [historyEntries, setHistoryEntries] = useState<DeadlineHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchDeadlines = useCallback(async () => {
    if (!activeSectionId) {
      setDeadlines([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("deadlines")
      .select("*")
      .eq("section_id", activeSectionId)
      .order("due_date", { ascending: true });
    if (!error && data) setDeadlines(data as Deadline[]);
    setLoading(false);
  }, [supabase, activeSectionId]);

  useEffect(() => {
    if (view !== "section" || !activeSectionId) return;

    fetchDeadlines();

    const channel = supabase
      .channel(`deadlines-realtime-${activeSectionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deadlines",
          filter: `section_id=eq.${activeSectionId}`,
        },
        () => fetchDeadlines()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [view, activeSectionId, fetchDeadlines, supabase]);

  // Register the service worker as early as possible — it's required
  // for notifications to actually display on Android Chrome.
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Notifications: ask for permission on first meaningful interaction,
  // then re-check milestones periodically while the tab is open.
  // Scoped to whatever deadlines are currently loaded for the active
  // section — never fires for sections the user isn't looking at.
  useEffect(() => {
    if (view !== "section" || !activeSectionId) return;
    const stop = startNotificationLoop(() => deadlines);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, activeSectionId, deadlines.length]);

  async function ensureNotificationPermission() {
    await requestNotificationPermission();
  }

  const subjects = useMemo(
    () => Array.from(new Set(deadlines.filter((d) => !d.deleted).map((d) => d.subject))).sort(),
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

    // Completed items sink to the very bottom, regardless of tab or
    // sort — Array.sort is stable, so this only reorders by
    // completed-vs-not and leaves everything else as already sorted.
    sorted.sort((a, b) => Number(a.completed) - Number(b.completed));

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
    if (!userEmail || !activeSectionId) return;
    const payload = {
      subject: values.subject.trim(),
      activity: values.activity.trim(),
      description: values.description.trim(),
      due_date: new Date(values.due_date).toISOString(),
      has_time: values.has_time,
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
        section_id: activeSectionId,
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

  async function handleToggleComplete(d: Deadline) {
    if (!userEmail) return;
    const nowCompleted = !d.completed;
    await supabase
      .from("deadlines")
      .update({
        completed: nowCompleted,
        completed_by: userEmail,
        completed_at: nowCompleted ? new Date().toISOString() : null,
      })
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
        <Header
          onUserChange={setUserEmail}
          sectionName={view === "section" ? activeSection?.name : null}
          onBack={view === "section" ? goToDashboard : undefined}
          onShowMembers={view === "section" ? () => setMembersOpen(true) : undefined}
        />

        {view === "dashboard" ? (
          <SectionDashboard
            sections={mySections}
            loading={sectionsLoading}
            canCreate={canEdit}
            onSelectSection={goToSection}
            onCreateClick={() => setCreateSectionOpen(true)}
            onJoinClick={() => setJoinSectionOpen(true)}
          />
        ) : (
          <>
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
                canEdit={canEdit}
                onManageSubjects={() => setManageSubjectsOpen(true)}
              />
            </div>

            {loading ? (
              <p className="text-sm text-folder-500 text-center py-14">Loading deadlines…</p>
            ) : (
              <div key={tab} className="animate-fade-in">
                <DeadlineList
                  deadlines={filtered}
                  canEdit={canEdit}
                  onEdit={(d) => {
                    setEditing(d);
                    setModalOpen(true);
                  }}
                  onTogglePin={handleTogglePin}
                  onToggleComplete={handleToggleComplete}
                  onViewHistory={openHistory}
                  onDelete={handleDelete}
                  onRestore={handleRestore}
                  emptyMessage={emptyMessages[tab]}
                />
              </div>
            )}
          </>
        )}

        <div className="h-24" />
      </div>

      {view === "section" && canEdit && (
        <button
          onClick={async () => {
            await ensureNotificationPermission();
            setEditing(null);
            setModalOpen(true);
          }}
          aria-label="Add a deadline"
          className="animate-fab-pop fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 rounded-full bg-folder-500 text-white w-14 h-14 shadow-cardHover hover:bg-folder-600 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}

      <AddDeadlineModal
        open={modalOpen}
        editing={editing}
        subjects={subjects}
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

      <CreateSectionModal
        open={createSectionOpen}
        onClose={() => setCreateSectionOpen(false)}
        onCreated={(section) => {
          fetchMySections();
          goToSection(section);
        }}
        userEmail={userEmail}
      />

      <JoinSectionModal
        open={joinSectionOpen}
        onClose={() => setJoinSectionOpen(false)}
        onJoined={(section) => {
          fetchMySections();
          goToSection(section);
        }}
        userEmail={userEmail}
      />

      <SectionMembersList
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        activeSectionId={activeSectionId}
        sectionName={activeSection?.name}
        userEmail={userEmail}
        onLeft={handleLeaveSection}
      />

      <ManageSubjectsModal
        open={manageSubjectsOpen}
        onClose={() => setManageSubjectsOpen(false)}
        subjects={subjects}
        activeSectionId={activeSectionId}
        onMerged={fetchDeadlines}
      />
    </div>
  );
}
