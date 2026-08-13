-- =====================================================================
-- Migration: allow leaving a section
-- Run in Supabase SQL Editor.
--
-- section_members previously had no DELETE policy at all, so there
-- was no way — not even a bug, just a genuinely missing capability —
-- for someone to remove their own membership. This adds exactly one
-- narrow policy: you can delete your own row, never anyone else's.
-- =====================================================================

drop policy if exists "members can leave a section" on public.section_members;
create policy "members can leave a section"
  on public.section_members for delete
  to authenticated
  using (user_email = auth.jwt() ->> 'email');
