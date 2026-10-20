# Duo Todo

A real-time, two-person productivity & accountability platform. Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase** (Auth, Postgres, Realtime, RLS).

## Features

- 🔐 Email/password authentication (Supabase Auth)
- 👯 Secure two-person pairing via invitation tokens
- ✅ Shared Today dashboard with live partner updates
- 📊 Weekly analytics (Recharts) and GitHub-style contribution heatmaps
- 🔥 XP, levels, streaks, and achievements
- 👏 Partner reactions / cheers with live notifications
- 📜 History + per-day reflections (private to owner)
- 🌗 Polished dark + light themes
- 🧱 Full PostgreSQL schema with Row Level Security policies

## Quick start

```bash
cp .env.example .env.local       # fill in Supabase URL + anon key
yarn install
yarn dev
```

### 1. Create a Supabase project
Go to https://supabase.com → New Project.

### 2. Apply the schema
In **Supabase → SQL editor**, run both files in order:

1. `supabase/migrations/001_init.sql` (tables, triggers, functions)
2. `supabase/migrations/002_rls_policies.sql` (RLS + Realtime publication)

### 3. Configure Auth
Supabase → **Authentication → URL Configuration**:

- Site URL: `http://localhost:3000` (or your Vercel URL)
- Redirect URLs: `http://localhost:3000/auth/callback`, `http://localhost:3000/reset-password`

### 4. Enable Realtime
Supabase → **Database → Replication**: the migration already registers the required tables under `supabase_realtime`. Confirm `todos`, `todo_subtasks`, `reactions`, `daily_targets`, `user_stats` are listed.

### 5. Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY   # Supabase → Settings → API → anon/publishable
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE   # SERVER ONLY — never expose
```

The service-role key is only used server-side (e.g. inside Route Handlers / Server Actions). It is never bundled into the browser.

### 6. Run

```bash
yarn dev
# http://localhost:3000
```

Create two accounts in two browsers / profiles. The first user creates a Duo during onboarding and copies the invite link. The second user signs in, opens the invite link, and both land on the same Today dashboard with live sync.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import into Vercel.
3. Set the three environment variables above.
4. Add your Vercel URL to Supabase → Auth → URL configuration.

## Architecture

```
app/            Next.js App Router routes
components/     UI primitives
hooks/          Realtime subscription + data hooks
lib/supabase/   Browser/server/middleware clients
lib/            Business logic (statistics, utils, dates)
supabase/       SQL migrations
```

- `middleware.ts` refreshes the Supabase session cookie on every request and gates `/today`, `/history`, `/insights`, `/settings`.
- Server Components use the server Supabase client for the initial fetch.
- Client Components subscribe to Postgres Changes scoped to the active duo.
- All mutations go through the user's session; RLS rejects any cross-duo access.
- `accept_invitation()` is a SECURITY DEFINER function — the only privileged write.

## Security highlights

- RLS enabled on every user-facing table.
- Owner must be an active member of a duo (DB trigger).
- Max 2 active members per duo (DB trigger + partial unique index per user).
- Invitations: stored only as token hashes, expirable, revocable, single-use.
- XP ledger prevents double-crediting a single task completion.
- Service-role key only read server-side.

## Scripts

```
yarn dev        # local dev server
yarn build      # production build
yarn typecheck  # strict TypeScript
yarn lint       # eslint
```
