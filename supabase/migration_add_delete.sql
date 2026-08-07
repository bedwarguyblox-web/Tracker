-- =====================================================================
-- Migration: soft delete for deadlines
-- Run this once in Supabase SQL Editor. Safe to run even if some of
-- this already exists (uses IF NOT EXISTS / CREATE OR REPLACE).
-- =====================================================================

alter table public.deadlines add column if not exists deleted boolean not null default false;
alter table public.deadlines add column if not exists deleted_by text;
alter table public.deadlines add column if not exists deleted_at timestamptz;

create index if not exists deadlines_deleted_idx on public.deadlines (deleted);

-- Replace the edit-logging trigger function so it also logs deletions
-- and restores as history entries, exactly like any other field edit.
-- No RLS changes are needed: "deleting" is just an UPDATE (setting
-- deleted = true), and the existing "school domain can update" policy
-- already covers it. There is still no DELETE policy on this table,
-- so a row can never actually be destroyed — only marked deleted and
-- restored, both of which are logged.
create or replace function public.log_deadline_edit()
returns trigger
language plpgsql
security definer
as $$
declare
  editor text := coalesce(new.last_edited_by, auth.jwt() ->> 'email', 'unknown');
begin
  if new.subject is distinct from old.subject then
    insert into public.deadline_history (deadline_id, field_name, previous_value, new_value, editor_email)
    values (old.id, 'subject', old.subject, new.subject, editor);
  end if;

  if new.activity is distinct from old.activity then
    insert into public.deadline_history (deadline_id, field_name, previous_value, new_value, editor_email)
    values (old.id, 'activity', old.activity, new.activity, editor);
  end if;

  if new.description is distinct from old.description then
    insert into public.deadline_history (deadline_id, field_name, previous_value, new_value, editor_email)
    values (old.id, 'description', old.description, new.description, editor);
  end if;

  if new.due_date is distinct from old.due_date then
    insert into public.deadline_history (deadline_id, field_name, previous_value, new_value, editor_email)
    values (old.id, 'due_date', old.due_date::text, new.due_date::text, editor);
  end if;

  if new.priority is distinct from old.priority then
    insert into public.deadline_history (deadline_id, field_name, previous_value, new_value, editor_email)
    values (old.id, 'priority', old.priority, new.priority, editor);
  end if;

  if new.attachment_url is distinct from old.attachment_url then
    insert into public.deadline_history (deadline_id, field_name, previous_value, new_value, editor_email)
    values (old.id, 'attachment_url', old.attachment_url, new.attachment_url, editor);
  end if;

  if new.pinned is distinct from old.pinned then
    insert into public.deadline_history (deadline_id, field_name, previous_value, new_value, editor_email)
    values (old.id, 'pinned', old.pinned::text, new.pinned::text, editor);
  end if;

  if new.deleted is distinct from old.deleted then
    insert into public.deadline_history (deadline_id, field_name, previous_value, new_value, editor_email)
    values (
      old.id,
      'deleted',
      case when old.deleted then 'deleted' else 'active' end,
      case when new.deleted then 'deleted' else 'restored' end,
      editor
    );
  end if;

  new.last_edited_at := now();
  new.edit_count := old.edit_count + 1;

  return new;
end;
$$;

-- Trigger already points at this function, so no need to recreate it.
