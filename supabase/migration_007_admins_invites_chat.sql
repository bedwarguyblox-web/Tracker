-- =====================================================================
-- Migration: admin roles, expiring invite links, section chat
-- Run in Supabase SQL Editor.
-- =====================================================================

create extension if not exists pgcrypto;


-- ---------------------------------------------------------------------
-- Roles. The creator becomes 'admin' automatically (updated trigger
-- below). Everyone else starts as 'member'.
-- ---------------------------------------------------------------------
alter table public.section_members
  add column if not exists role text not null default 'member'
  check (role in ('admin', 'member'));

create or replace function public.auto_join_creator()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.section_members (section_id, user_email, role)
  values (new.id, new.created_by, 'admin')
  on conflict do nothing;
  return new;
end;
$$;

-- Optional section description, shown on the section card/header.
alter table public.sections add column if not exists description text;

-- ---------------------------------------------------------------------
-- Helper: is this email an admin of this section?
-- ---------------------------------------------------------------------
create or replace function public.is_section_admin(p_section_id uuid, p_email text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.section_members sm
    where sm.section_id = p_section_id
      and sm.user_email = p_email
      and sm.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- section_members: admins can change another member's role, and can
-- remove (kick) another member. Self-leave (from the earlier
-- migration) still works — these are additional, not replacements.
-- A safety rule is enforced in the update policy: you can never leave
-- a section with zero admins by demoting the last one.
-- ---------------------------------------------------------------------
drop policy if exists "admins can change member roles" on public.section_members;
create policy "admins can change member roles"
  on public.section_members for update
  to authenticated
  using (public.is_section_admin(section_id, auth.jwt() ->> 'email'))
  with check (
    public.is_section_admin(section_id, auth.jwt() ->> 'email')
    and (
      role = 'admin'
      or exists (
        select 1 from public.section_members other
        where other.section_id = section_members.section_id
          and other.role = 'admin'
          and other.user_email <> section_members.user_email
      )
    )
  );

drop policy if exists "admins can remove members" on public.section_members;
create policy "admins can remove members"
  on public.section_members for delete
  to authenticated
  using (
    public.is_section_admin(section_id, auth.jwt() ->> 'email')
    and user_email <> auth.jwt() ->> 'email'
  );

-- ---------------------------------------------------------------------
-- Table: section_invites — expiring, revocable invite links.
-- Replaces typed join codes as the primary way to invite people;
-- the underlying join-by-code function from an earlier migration is
-- left in place (harmless) but the app's UI now generates and
-- consumes links instead.
-- ---------------------------------------------------------------------
create table if not exists public.section_invites (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid not null references public.sections (id) on delete cascade,
  token text not null unique,
  created_by text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  max_uses integer, -- null = unlimited uses until it expires
  use_count integer not null default 0,
  revoked boolean not null default false
);

create index if not exists section_invites_token_idx on public.section_invites (token);
create index if not exists section_invites_section_id_idx on public.section_invites (section_id);

alter table public.section_invites enable row level security;

-- Admins of a section can see (and therefore manage) its invites.
drop policy if exists "admins can read their invites" on public.section_invites;
create policy "admins can read their invites"
  on public.section_invites for select
  to authenticated
  using (public.is_section_admin(section_id, auth.jwt() ->> 'email'));

drop policy if exists "admins can revoke invites" on public.section_invites;
create policy "admins can revoke invites"
  on public.section_invites for update
  to authenticated
  using (public.is_section_admin(section_id, auth.jwt() ->> 'email'))
  with check (public.is_section_admin(section_id, auth.jwt() ->> 'email'));

-- Invites are only ever created/consumed through the two functions
-- below (both security definer) — never directly by the client.
drop policy if exists "no direct invite inserts" on public.section_invites;
create policy "no direct invite inserts"
  on public.section_invites for insert
  to authenticated
  with check (false);

-- ---------------------------------------------------------------------
-- RPC: create an invite link. Only a section admin can call this.
-- ---------------------------------------------------------------------
create or replace function public.create_section_invite(
  p_section_id uuid,
  p_expires_in_hours integer default 24,
  p_max_uses integer default null
)
returns public.section_invites
language plpgsql
security definer
as $$
declare
  caller text := auth.jwt() ->> 'email';
  new_invite public.section_invites;
  new_token text;
begin
  if not public.is_section_admin(p_section_id, caller) then
    raise exception 'Only a section admin can create an invite link';
  end if;

  -- 22-ish char URL-safe random token
  new_token := encode(gen_random_bytes(16), 'hex');

  insert into public.section_invites (section_id, token, created_by, expires_at, max_uses)
  values (
    p_section_id,
    new_token,
    caller,
    now() + make_interval(hours => greatest(1, p_expires_in_hours)),
    p_max_uses
  )
  returning * into new_invite;

  return new_invite;
end;
$$;

grant execute on function public.create_section_invite(uuid, integer, integer) to authenticated;

-- ---------------------------------------------------------------------
-- RPC: join a section via an invite link's token.
-- ---------------------------------------------------------------------
create or replace function public.join_section_by_invite(p_token text)
returns public.sections
language plpgsql
security definer
as $$
declare
  caller text := auth.jwt() ->> 'email';
  invite public.section_invites;
  target public.sections;
begin
  if caller is null or caller not like '%@mrc.pshs.edu.ph' then
    raise exception 'Only school accounts can join a section';
  end if;

  select * into invite from public.section_invites where token = p_token for update;
  if not found then
    raise exception 'This invite link is invalid.';
  end if;
  if invite.revoked then
    raise exception 'This invite link has been turned off.';
  end if;
  if invite.expires_at < now() then
    raise exception 'This invite link has expired.';
  end if;
  if invite.max_uses is not null and invite.use_count >= invite.max_uses then
    raise exception 'This invite link has already been used up.';
  end if;

  select * into target from public.sections where id = invite.section_id;

  insert into public.section_members (section_id, user_email, role)
  values (invite.section_id, caller, 'member')
  on conflict do nothing;

  update public.section_invites set use_count = use_count + 1 where id = invite.id;

  return target;
end;
$$;

grant execute on function public.join_section_by_invite(text) to authenticated;

-- ---------------------------------------------------------------------
-- Table: section_messages — a simple chat stream per section.
-- ---------------------------------------------------------------------
create table if not exists public.section_messages (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid not null references public.sections (id) on delete cascade,
  sender_email text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists section_messages_section_id_idx on public.section_messages (section_id, created_at);

alter table public.section_messages enable row level security;

drop policy if exists "members can read section messages" on public.section_messages;
create policy "members can read section messages"
  on public.section_messages for select
  to authenticated
  using (public.is_section_member(section_id, auth.jwt() ->> 'email'));

drop policy if exists "members can send section messages" on public.section_messages;
create policy "members can send section messages"
  on public.section_messages for insert
  to authenticated
  with check (
    public.is_section_member(section_id, auth.jwt() ->> 'email')
    and sender_email = auth.jwt() ->> 'email'
  );

-- Moderation: a message can be removed by whoever sent it, or by any
-- admin of that section.
drop policy if exists "sender or admin can delete messages" on public.section_messages;
create policy "sender or admin can delete messages"
  on public.section_messages for delete
  to authenticated
  using (
    sender_email = auth.jwt() ->> 'email'
    or public.is_section_admin(section_id, auth.jwt() ->> 'email')
  );

-- ---------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.section_messages;
