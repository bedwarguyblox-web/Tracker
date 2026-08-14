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
  completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  has_time: boolean;
  section_id: string;
}

export interface Section {
  id: string;
  name: string;
  description: string | null;
  join_code: string;
  created_by: string;
  created_at: string;
}

export type MemberRole = "admin" | "member";

export interface SectionMember {
  id: string;
  section_id: string;
  user_email: string;
  role: MemberRole;
  joined_at: string;
}

export interface SectionInvite {
  id: string;
  section_id: string;
  token: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  max_uses: number | null;
  use_count: number;
  revoked: boolean;
}

export interface SectionMessage {
  id: string;
  section_id: string;
  sender_email: string;
  body: string;
  created_at: string;
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
