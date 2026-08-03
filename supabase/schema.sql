-- =====================================================================
-- MRC Deadline Tracker — Supabase schema
-- Run this in Supabase SQL Editor (Project -> SQL Editor -> New query)
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- Table: deadlines
-- ---------------------------------------------------------------------
create table if not exists public.deadlines (
  id uuid primary key default uuid_generate_v4(),
  subject text not null,
  activity text not null,
  description text default '',
  due_date timestamptz not null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  attachment_url text,
  pinned boolean not null default false,
  created_by text not null,        -- email of creator
  created_at timestamptz not null default now(),
  last_edited_by text,             -- email of last editor
  last_edited_at timestamptz,
  edit_count integer not null default 0
);

create index if not exists deadlines_due_date_idx on public.deadlines (due_date);
create index if not exists deadlines_pinned_idx on public.deadlines (pinned);

-- ---------------------------------------------------------------------
-- Table: deadline_history
-- One row per changed field, per edit. Nothing is ever deleted here.
-- ---------------------------------------------------------------------
create table if not exists public.deadline_history (
  id uuid primary key default uuid_generate_v4(),
  deadline_id uuid not null references public.deadlines (id) on delete cascade,
  field_name text not null,
  previous_value text,
  new_value text,
  editor_email text not null,
  edited_at timestamptz not null default now()
);

create index if not exists deadline_history_deadline_id_idx on public.deadline_history (deadline_id);

-- ---------------------------------------------------------------------
-- Trigger: automatically log every field change to deadline_history
-- and stamp last_edited_by / last_edited_at / edit_count.
-- This runs at the database level so history can never be bypassed
-- by app-layer bugs or trolling.
-- ---------------------------------------------------------------------
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

  new.last_edited_at := now();
  new.edit_count := old.edit_count + 1;

  return new;
end;
$$;

drop trigger if exists trg_log_deadline_edit on public.deadlines;
create trigger trg_log_deadline_edit
  before update on public.deadlines
  for each row
  execute function public.log_deadline_edit();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.deadlines enable row level security;
alter table public.deadline_history enable row level security;

-- Anyone (including anonymous/public visitors) can VIEW deadlines.
drop policy if exists "public can read deadlines" on public.deadlines;
create policy "public can read deadlines"
  on public.deadlines for select
  using (true);

drop policy if exists "public can read history" on public.deadline_history;
create policy "public can read history"
  on public.deadline_history for select
  using (true);

-- Only signed-in users with an @mrc.pshs.edu.ph email may INSERT.
drop policy if exists "school domain can insert" on public.deadlines;
create policy "school domain can insert"
  on public.deadlines for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') like '%@mrc.pshs.edu.ph');

-- Only signed-in users with an @mrc.pshs.edu.ph email may UPDATE.
-- Deleting is intentionally never granted to anyone (no delete policy
-- exists at all), which enforces "entries cannot be deleted" at the
-- database layer, not just in the UI.
drop policy if exists "school domain can update" on public.deadlines;
create policy "school domain can update"
  on public.deadlines for update
  to authenticated
  using ((auth.jwt() ->> 'email') like '%@mrc.pshs.edu.ph')
  with check ((auth.jwt() ->> 'email') like '%@mrc.pshs.edu.ph');

-- History rows are written only by the trigger (security definer),
-- never directly by clients.
drop policy if exists "no direct history writes" on public.deadline_history;
create policy "no direct history writes"
  on public.deadline_history for insert
  to authenticated
  with check (false);

-- ---------------------------------------------------------------------
-- Realtime: broadcast changes so every open tab updates live.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.deadlines;
alter publication supabase_realtime add table public.deadline_history;
