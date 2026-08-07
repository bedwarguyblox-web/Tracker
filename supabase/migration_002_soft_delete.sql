-- =====================================================================
-- Migration: soft-delete support
-- Run this in Supabase SQL Editor. Safe to run once on your existing
-- database — it only adds columns and replaces the trigger function,
-- it does not touch existing rows.
-- =====================================================================

alter table public.deadlines
  add column if not exists deleted boolean not null default false,
  add column if not exists deleted_by text,
  add column if not exists deleted_at timestamptz;

create index if not exists deadlines_deleted_idx on public.deadlines (deleted);

-- Replace the edit-logging trigger function so it also logs
-- deleted/restored transitions, the same tamper-evident way as any
-- other field edit.
create or replace function public.log_deadline_edit()
returns trigger
language plpgsql
security definer
as $$
declare
  editor text := coalesce(new.last_edited_by, new.deleted_by, auth.jwt() ->> 'email', 'unknown');
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
      old.deleted::text,
      new.deleted::text,
      coalesce(new.deleted_by, editor)
    );
  end if;

  new.last_edited_at := now();
  new.edit_count := old.edit_count + 1;

  return new;
end;
$$;

-- Trigger already exists and points at this function by name, so no
-- need to recreate it — CREATE OR REPLACE above is enough.
