# MRC Deadline Tracker

A shared deadline tracker — **not a calendar**. The homepage is a single chronological
list of deadlines sorted by urgency, answering one question: *what's due next?*

Stack: **Next.js 14 (App Router) + TypeScript + Tailwind**, **Supabase** (Postgres +
Auth + Realtime), deployed on **Vercel**. Everything below fits comfortably in each
service's free tier.

## What's implemented

- Chronological deadline list (no month/week views), sorted by nearest due date
- Google OAuth restricted to `@mrc.pshs.edu.ph` — enforced in three places: the OAuth
  callback (kicks out non-school accounts immediately), the UI (view-only for others),
  and **Postgres Row Level Security** (the real gate — see `supabase/schema.sql`)
- Add / edit modal with validation; **no delete** anywhere in the app or the database
  (there is no delete RLS policy, so it's not possible even via the API)
- Automatic urgency color stages: normal → yellow (7d) → orange (3d) → red (today) →
  overdue, with a live "X days left" / "X hours left" label
- Expired deadlines move to an **Overdue** tab automatically — nothing is deleted
- Tabs: Upcoming (default), Today, Pinned, Overdue, History
- Pinning — pinned items show in the Pinned tab and float to the top of Upcoming
- **Database-level edit history**: a Postgres trigger logs every field change
  (previous value, new value, editor email, timestamp) — this can't be bypassed by
  app bugs, and it's what the "edited ×N" badge and history modal read from
- Browser notifications at 3/2/1 days and day-of, once per day per milestone, with
  state kept in `localStorage` so it "catches up" whenever the site is reopened
- Search, plus filters (subject, priority) and sorting (closest, furthest, recently
  edited, subject)
- Dashboard stat strip (upcoming, due today, overdue, pinned, recently edited)
- Realtime updates via Supabase Realtime — no refresh needed
- Dark/light mode, mobile-first responsive layout

### Not implemented (left as extensions)

Most items in the brief's "nice-to-have" list are intentionally left out to keep this
buildable and reviewable: repeat deadlines, rich text, mentions, comments, CSV/ICS
export, offline/PWA install, undo, revert-from-history, and public read-only share
links. The data model (especially `deadline_history`) is built so most of these are
straightforward additions later.

**On background notifications:** this app checks due dates on page load and every 30
minutes while a tab is open, using `Notification` — that's genuinely free and needs no
extra infrastructure, but it only fires while a tab is open somewhere. True
notifications when the site is fully closed would need a **Service Worker + the Push
API**, plus a small server-side cron (e.g. a Supabase Edge Function on a schedule) that
pushes to each subscribed browser — that requires generating VAPID keys and storing a
push subscription per user, which is a bigger lift than fits here but is a clean
follow-up.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New project (free tier).
2. Once it's up, open **SQL Editor** → New query, paste the full contents of
   [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates the
   `deadlines` and `deadline_history` tables, the history-logging trigger, and the
   Row Level Security policies (public read, school-domain-only write, no delete).
3. Go to **Authentication → Providers → Google** and enable it. You'll need a Google
   OAuth Client ID/Secret from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (Web application type). Set the authorized redirect URI to the callback URL Supabase
   shows on that page (looks like `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`).
4. Go to **Authentication → URL Configuration** and add your site URL (and
   `http://localhost:3000` for local dev) to the allowed redirect URLs.
5. Go to **Project Settings → API** and copy the **Project URL** and **anon public**
   key — you'll need them in the next step.

> The domain restriction is enforced twice: the OAuth request passes Google's `hd`
> (hosted domain) hint so the school's Google Workspace can steer sign-in, and the
> server-side callback + database RLS policies reject any email that isn't
> `@mrc.pshs.edu.ph` regardless of what the client sends. Don't rely on `hd` alone —
> it's a hint to Google's picker, not a security boundary.

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=mrc.pshs.edu.ph
```

## 3. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

## 4. Deploy to Vercel (free tier)

1. Push this project to a GitHub repo.
2. Go to [vercel.com](https://vercel.com) → New Project → import the repo.
3. Add the same three environment variables from `.env.local` in Vercel's project
   settings (Environment Variables).
4. Deploy. Vercel gives you HTTPS automatically.
5. Back in Supabase → Authentication → URL Configuration, add your live Vercel URL
   (and its `/auth/callback` path) to the allowed redirect URLs, and add the same URL
   as an authorized redirect URI in the Google Cloud OAuth client.

The app stays online continuously on Vercel's free tier (serverless, no idle
shutdown) and Supabase's free tier includes a persistent Postgres database — it does
pause after a week of *zero* API activity, which a live class deadline list won't hit
in practice, but if it ever does, opening the Supabase dashboard un-pauses it in
seconds.

## Database schema summary

**`deadlines`** — one row per deadline: subject, activity, description, due_date,
priority, attachment_url, pinned, created_by/created_at, last_edited_by/at, edit_count.

**`deadline_history`** — one row per changed field per edit: which field, previous
value, new value, editor email, timestamp. Populated automatically by a trigger on
`deadlines` — application code never writes to this table directly, which is what
makes the history tamper-resistant.

See [`supabase/schema.sql`](./supabase/schema.sql) for the full definitions, trigger,
and RLS policies.

## Project structure

```
app/
  layout.tsx            root layout, theme bootstrap
  page.tsx              the deadline list — the whole app lives here
  globals.css           Tailwind + font imports
  auth/callback/route.ts  OAuth code exchange + domain enforcement
components/
  Header.tsx, ThemeToggle.tsx, AuthButton.tsx
  DashboardStats.tsx, TabsNav.tsx, SearchFilterBar.tsx
  DeadlineList.tsx, DeadlineCard.tsx
  AddDeadlineModal.tsx, HistoryModal.tsx
lib/
  supabase/client.ts, supabase/server.ts
  types.ts, utils.ts (urgency/date logic), notifications.ts
supabase/
  schema.sql
```
