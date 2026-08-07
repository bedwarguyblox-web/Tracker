export type Priority = "low" | "normal" | "high";

export interface Deadline {
  id: string;
  subject: string;
  activity: string;
  description: string;
  due_date: string; // ISO timestamp
  priority: Priority;
  attachment_url: string | null;
  pinned: boolean;
  created_by: string;
  created_at: string;
  last_edited_by: string | null;
  last_edited_at: string | null;
  edit_count: number;
  deleted: boolean;
  deleted_by: string | null;
  deleted_at: string | null;
}

export interface DeadlineHistoryEntry {
  id: string;
  deadline_id: string;
  field_name: string;
  previous_value: string | null;
  new_value: string | null;
  editor_email: string;
  edited_at: string;
}

export type UrgencyStage =
  | "overdue"
  | "today"
  | "orange" // <= 3 days
  | "yellow" // <= 7 days
  | "normal";

export type TabKey = "upcoming" | "today" | "pinned" | "overdue" | "deleted" | "history";

export type SortKey = "closest" | "furthest" | "recent" | "subject";
