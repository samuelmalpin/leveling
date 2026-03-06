# Leveling MVP

Gamified fitness RPG web app MVP built with Next.js, Supabase, PostgreSQL, TailwindCSS, and shadcn-style UI components.

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- TailwindCSS
- shadcn/ui-style component patterns
- Supabase (Auth + Postgres + RLS + RPC)
- PostgreSQL (schema + progression functions)

## Project Folder Structure

```txt
leveling/
	app/
		api/
			bosses/[bossProgressId]/attempt/route.ts
			profile/bootstrap/route.ts
			quests/[questProgressId]/claim/route.ts
			workouts/complete/route.ts
		auth/signout/route.ts
		bosses/page.tsx
		login/page.tsx
		profile/page.tsx
		quests/page.tsx
		signup/page.tsx
		workouts/new/page.tsx
		globals.css
		layout.tsx
		page.tsx
	components/
		auth/auth-form.tsx
		features/
			boss-list.tsx
			muscle-grid.tsx
			quest-list.tsx
			stat-card.tsx
			workout-form.tsx
		layout/app-shell.tsx
		ui/
			badge.tsx
			button.tsx
			card.tsx
			input.tsx
			label.tsx
			progress.tsx
	lib/
		auth/require-user.ts
		game/
			exercise-map.ts
			progression.ts
		supabase/
			admin.ts
			client.ts
			middleware.ts
			server.ts
		constants.ts
		types.ts
		utils.ts
	supabase/
		migrations/
			001_init.sql
	.env.example
	.eslintrc.json
	middleware.ts
	next.config.mjs
	next-env.d.ts
	package.json
	postcss.config.mjs
	tailwind.config.ts
	tsconfig.json
```

## Database Setup

### 1. Create Supabase Project

- Create a new Supabase project.
- Copy `Project URL`, `anon key`, and `service_role key`.

### 2. Environment Variables

Create `.env.local` using `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Run Migration

- Open Supabase SQL editor.
- Run `supabase/migrations/001_init.sql`.

This migration includes:

- All core relational tables
- Indexing strategy for fast lookups
- RLS policies
- Seed data for exercises, quests, bosses, achievements
- RPC functions for rewards and progression

## Backend Logic

Core progression pipeline uses database functions to keep rewards authoritative and transactional.

- `fn_apply_workout_rewards(user_id, workout_id)`:
	- computes workout XP from volume
	- updates streak
	- updates account level
	- updates muscle XP/ranks
	- updates quest progress
	- evaluates boss unlocks
- `fn_claim_quest(user_id, quest_progress_id)`:
	- validates completion state
	- marks claimed
	- grants XP to account
- `fn_attempt_boss(user_id, boss_progress_id)`:
	- validates lock state
	- runs score check
	- grants XP if defeated
- `fn_grant_initial_content(user_id)`:
	- assigns starter quest and boss progress rows

API routes:

- `POST /api/profile/bootstrap`
- `POST /api/workouts/complete`
- `POST /api/quests/:questProgressId/claim`
- `POST /api/bosses/:bossProgressId/attempt`

## Frontend Pages

- `Dashboard` (`app/page.tsx`): level, XP, streak, muscle overview, live objectives.
- `Log Workout` (`app/workouts/new/page.tsx`): session logging and completion.
- `Profile` (`app/profile/page.tsx`): identity, progression summary, achievements.
- `Quests` (`app/quests/page.tsx`): quest progress and reward claiming.
- `Bosses` (`app/bosses/page.tsx`): challenge progression and attempts.
- `Login / Signup` (`app/login`, `app/signup`): Supabase auth flows.

## Example Components

- `WorkoutForm`: client form for exercises/sets input and completion call.
- `MuscleGrid`: card grid with per-muscle rank/level progression.
- `QuestList`: progress bars and claim actions.
- `BossList`: boss status, attempts, and challenge trigger.
- `StatCard`: reusable summary stat component for dashboard/profile.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Notes

- Critical reward logic is in SQL RPC functions for anti-exploit consistency.
- Server routes use Supabase service-role client only on trusted server side.
- User-facing queries rely on RLS-protected tables.

