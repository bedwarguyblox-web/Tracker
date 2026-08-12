-- =====================================================================
-- Migration: Classroom-style sections (PATCHED)
--
-- Fixes two issues from the original version of this migration:
--   1. Non-destructive: existing deadlines (and their edit history)
--      are preserved by moving them into a real "General" section,
--      instead of being deleted. Deadline_history is untouched.
--   2. Join codes are now actually enforced by the database: the
--      sections table is no longer fully readable by any school
--      account, and joining a section only happens through the
--      join_section_by_code() function below, which checks the code
--      server-side. Direct inserts into section_members are blocked.
--
-- Safe to run once. If you already ran the original (destructive)
-- version of this migration, this one is still safe to run on top —
-- it just won't have old data to preserve anymore.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Table: sections
-- `slug` is a fixed, code-free identifier only used for the one
-- built-in "General" section — every other section relies purely on
-- its join_code.
-- ---------------------------------------------------------------------
create table if not exists public.sections (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  join_code text not null unique,
  created_by text not null,
  created_at timestamptz not null default now(),
  slug text unique,
  constraint sections_join_code_length check (char_length(join_code) between 6 and 8)
);

alter table public.sections add column if not exists slug text unique;

create index if not exists sections_join_code_idx on public.sections (join_code);

-- ---------------------------------------------------------------------
-- Table: section_members
-- ---------------------------------------------------------------------
create table if not exists public.section_members (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid not null references public.sections (id) on delete cascade,
  user_email text not null,
  joined_at timestamptz not null default now(),
  unique (section_id, user_email)
);

create index if not exists section_members_section_id_idx on public.section_members (section_id);
create index if not exists section_members_user_email_idx on public.section_members (user_email);

-- ---------------------------------------------------------------------
-- Seed the "General" section — a stand-in for your original site
-- behavior, open to every school account automatically (see the
-- auto-join trigger further down). This is what existing deadlines
-- get moved into, instead of being deleted.
-- ---------------------------------------------------------------------
insert into public.sections (name, join_code, created_by, slug)
select 'General', 'GENERAL', 'system', 'general'
where not exists (select 1 from public.sections where slug = 'general');

-- ---------------------------------------------------------------------
-- deadlines.section_id — existing rows move into General rather than
-- being deleted. Nothing in deadline_history is touched.
-- ---------------------------------------------------------------------
alter table public.deadlines add column if not exists section_id uuid references public.sections (id) on delete cascade;

update public.deadlines
set section_id = (select id from public.sections where slug = 'general')
where section_id is null;

alter table public.deadlines alter column section_id set not null;

create index if not exists deadlines_section_id_idx on public.deadlines (section_id);

-- ---------------------------------------------------------------------
-- Backfill: give every email that already appears anywhere in your
-- data (as a creator, editor, or deleter) membership in General, so
-- nobody who was already using the site loses access to their own
-- history after this migration.
-- ---------------------------------------------------------------------
insert into public.section_members (section_id, user_email)
select (select id from public.sections where slug = 'general'), email
from (
  select distinct created_by as email from public.deadlines
  union
  select distinct last_edited_by from public.deadlines where last_edited_by is not null
  union
  select distinct deleted_by from public.deadlines where deleted_by is not null
  union
  select distinct editor_email from public.deadline_history
) known_emails
where email like '%@mrc.pshs.edu.ph'
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Going forward: auto-enroll every new school sign-in into General,
-- so the app keeps behaving like "anyone with a school account sees
-- the shared list" for that one section, same as before sections
-- existed — while every other section stays strictly invite-by-code.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_school_user()
returns trigger
language plpgsql
security definer
as $$
declare
  general_id uuid;
begin
  if new.email like '%@mrc.pshs.edu.ph' then
    select id into general_id from public.sections where slug = 'general';
    if general_id is not null then
      insert into public.section_members (section_id, user_email)
      values (general_id, new.email)
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_join_general on auth.users;
create trigger on_auth_user_created_join_general
  after insert on auth.users
  for each row
  execute function public.handle_new_school_user();

-- ---------------------------------------------------------------------
-- Helper: membership check as security-definer, so RLS policies that
-- key off it don't recurse into themselves.
-- ---------------------------------------------------------------------
create or replace function public.is_section_member(p_section_id uuid, p_email text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.section_members sm
    where sm.section_id = p_section_id and sm.user_email = p_email
  );
$$;

-- ---------------------------------------------------------------------
-- Whoever creates a section is automatically its first member — done
-- server-side now (not by the client inserting itself), so it works
-- even though direct section_members inserts are blocked below.
-- ---------------------------------------------------------------------
create or replace function public.auto_join_creator()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.section_members (section_id, user_email)
  values (new.id, new.created_by)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_auto_join_creator on public.sections;
create trigger trg_auto_join_creator
  after insert on public.sections
  for each row
  execute function public.auto_join_creator();

-- ---------------------------------------------------------------------
-- RPC: the ONLY way to join a section by code. Runs as a trusted
-- function so a client never needs broad read access to the sections
-- table just to look a code up — this is what actually enforces "you
-- can only get in if you know the code," instead of that being a
-- UI-only speed bump.
-- ---------------------------------------------------------------------
create or replace function public.join_section_by_code(p_code text)
returns public.sections
language plpgsql
security definer
as $$
declare
  target public.sections;
  caller text := auth.jwt() ->> 'email';
begin
  if caller is null or caller not like '%@mrc.pshs.edu.ph' then
    raise exception 'Only school accounts can join a section';
  end if;

  select * into target from public.sections where join_code = upper(trim(p_code));
  if not found then
    raise exception 'Invalid join code';
  end if;

  insert into public.section_members (section_id, user_email)
  values (target.id, caller)
  on conflict do nothing;

  return target;
end;
$$;

grant execute on function public.join_section_by_code(text) to authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security: sections
-- Readable only if you're a member, you created it, or it's the
-- always-open General section. NOT readable by every school account
-- anymore — that was the gap that let anyone list every join_code.
-- Still no update/delete policy, so sections can't be edited/destroyed.
-- ---------------------------------------------------------------------
alter table public.sections enable row level security;

drop policy if exists "school domain can read sections" on public.sections;
drop policy if exists "members can read their sections" on public.sections;
create policy "members can read their sections"
  on public.sections for select
  to authenticated
  using (
    slug = 'general'
    or created_by = auth.jwt() ->> 'email'
    or public.is_section_member(id, auth.jwt() ->> 'email')
  );

drop policy if exists "school domain can create sections" on public.sections;
create policy "school domain can create sections"
  on public.sections for insert
  to authenticated
  with check (
    (auth.jwt() ->> 'email') like '%@mrc.pshs.edu.ph'
    and created_by = auth.jwt() ->> 'email'
  );

-- ---------------------------------------------------------------------
-- Row Level Security: section_members
-- Reading: your own rows, or the roster of any section you're in.
-- Writing: blocked entirely. Membership can only be created by
-- join_section_by_code() or the auto_join_creator trigger, both of
-- which run with elevated privileges and their own checks — this is
-- what makes the join code a real gate instead of a UI suggestion.
-- ---------------------------------------------------------------------
alter table public.section_members enable row level security;

drop policy if exists "members can read own or shared roster" on public.section_members;
create policy "members can read own or shared roster"
  on public.section_members for select
  to authenticated
  using (
    user_email = auth.jwt() ->> 'email'
    or public.is_section_member(section_id, auth.jwt() ->> 'email')
  );

drop policy if exists "school domain can join sections" on public.section_members;
drop policy if exists "no direct member inserts" on public.section_members;
create policy "no direct member inserts"
  on public.section_members for insert
  to authenticated
  with check (false);

-- ---------------------------------------------------------------------
-- Row Level Security: deadlines (unchanged logic from the original
-- sections migration — already correctly membership-gated, and now
-- General behaves the same way since everyone auto-joins it).
-- ---------------------------------------------------------------------
drop policy if exists "public can read deadlines" on public.deadlines;
drop policy if exists "members can read section deadlines" on public.deadlines;
create policy "members can read section deadlines"
  on public.deadlines for select
  to authenticated
  using (public.is_section_member(section_id, auth.jwt() ->> 'email'));

drop policy if exists "school domain can insert" on public.deadlines;
drop policy if exists "school domain member can insert" on public.deadlines;
create policy "school domain member can insert"
  on public.deadlines for insert
  to authenticated
  with check (
    (auth.jwt() ->> 'email') like '%@mrc.pshs.edu.ph'
    and public.is_section_member(section_id, auth.jwt() ->> 'email')
  );

drop policy if exists "school domain can update" on public.deadlines;
drop policy if exists "school domain member can update" on public.deadlines;
create policy "school domain member can update"
  on public.deadlines for update
  to authenticated
  using (
    (auth.jwt() ->> 'email') like '%@mrc.pshs.edu.ph'
    and public.is_section_member(section_id, auth.jwt() ->> 'email')
  )
  with check (
    (auth.jwt() ->> 'email') like '%@mrc.pshs.edu.ph'
    and public.is_section_member(section_id, auth.jwt() ->> 'email')
  );

-- ---------------------------------------------------------------------
-- Row Level Security: deadline_history (unchanged from original)
-- ---------------------------------------------------------------------
drop policy if exists "public can read history" on public.deadline_history;
drop policy if exists "members can read section history" on public.deadline_history;
create policy "members can read section history"
  on public.deadline_history for select
  to authenticated
  using (
    exists (
      select 1 from public.deadlines d
      where d.id = deadline_history.deadline_id
        and public.is_section_member(d.section_id, auth.jwt() ->> 'email')
    )
  );

-- ---------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.sections;
alter publication supabase_realtime add table public.section_members;
