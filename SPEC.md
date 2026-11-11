# Duo Todo — Study Workspace (what this build adds)

The repo at `/app/duo-todo` (clone of github.com/vikrantan5/duo-todo) now includes the
subject-wise study management module on top of the original two-person daily-task app.
**Deliverable is the Next.js codebase itself** — the Emergent pod preview keeps showing the
pod's starter template; run the app locally with your own Supabase keys (`yarn dev`).

## Setup (local)

1. `.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (server-only), optional `NEXT_PUBLIC_APP_URL`.
2. Apply `supabase/migrations/005_study_module.sql` in the Supabase SQL editor
   (after 001–004). It creates `subjects`, `topics`, `subtopics`, `revision_history`,
   `study_sessions`, owner-only RLS, realtime publication entries, and two RPCs.
3. `yarn install && yarn dev`.

## What was added

- **Pages**: `/subjects` (My Subjects workspace), `/revisions` (Revision Tracker),
  `/together` (Study Together comparison). Dashboard (`/today`) gained a Study Analytics
  section; `/insights` gained a weekly study report. TopNav has Subjects / Revisions /
  Together tabs. Existing daily-task features untouched.
- **Hierarchy**: Subject → Topic → Subtopic, all private per user (RLS: owner-only; the
  partner only ever sees aggregates through RPCs).
- **Revision engine**: `complete_revision(_subtopic_id)` RPC atomically flips
  `not_started → studied` (first study, history row `revision_number = 0`) or bumps
  `revision_count`, appends a `revision_history` row, stamps `last_revised_at`, and
  schedules `next_due_at` with spaced repetition **1d → 3d → 7d → 14d** (14d forever after).
- **Metrics** (two, never merged): *study completion* = % subtopics studied at least once;
  *revision health* = % of studied subtopics on schedule with their spaced plan.
  `get_duo_study_overview()` RPC exposes per-member + per-subject aggregates for the
  Together page; `get_duo_weekly_study()` feeds the Insights weekly chart.
- **Search/filters**: subjects page searches subject/topic/subtopic titles and filters by
  status (incl. "Revision due") and difficulty (easy/medium/hard).
- **Streak**: consecutive revision days (from `revision_history`), shown on the tracker
  and dashboard.

## Demo data

`node scripts/seed-demo.mjs` (repo root, needs the service-role key in env/.env.local)
creates a paired duo with full study trees and 2 weeks of revision history:

- aarav@duo-todo.demo / DuoDemo123! (owner)
- meera@duo-todo.demo / DuoDemo123! (member)

## Verification status

`yarn typecheck` (tsc --noEmit) is the gate used in the pod — no Supabase project is
reachable from the pod, so runtime/SQL paths were not executed here. Run
`yarn build` locally and apply migration 005 before first use.
