-- =====================================================================
-- Migration: mark-as-done
-- Run this in Supabase SQL Editor.
-- (Auto-purge of old deleted items was left out for now, per request —
-- you're handling cleanup manually. Ask if you want that added back
-- later; it's a quick addition on top of this.)
-- =====================================================================

alter table public.deadlines
  add column if not exists completed boolean not null default false,
  add column if not exists completed_by text,
  add column if not exists completed_at timestamptz;

create index if not exists deadlines_completed_idx on public.deadlines (completed);

-- Log completion/un-completion through the same trigger that already
-- logs every other edit, so it shows up in a deadline's history too.
create or replace function public.log_deadline_edit()
returns trigger
language plpgsql
security definer
as $$
declare
  editor text := coalesce(new.last_edited_by, new.deleted_by, new.completed_by, auth.jwt() ->> 'email', 'unknown');
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
    values (old.id, 'deleted', old.deleted::text, new.deleted::text, coalesce(new.deleted_by, editor));
  end if;

  if new.completed is distinct from old.completed then
    insert into public.deadline_history (deadline_id, field_name, previous_value, new_value, editor_email)
    values (old.id, 'completed', old.completed::text, new.completed::text, coalesce(new.completed_by, editor));
  end if;

  new.last_edited_at := now();
  new.edit_count := old.edit_count + 1;

  return new;
end;
$$;
