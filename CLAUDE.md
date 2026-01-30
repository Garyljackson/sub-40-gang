# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

S40G (Sub 40 Gang) is a mobile-first web app that tracks running milestones for a social running group working toward running 10km in under 40 minutes. The app connects to Strava, automatically detects qualifying runs via webhooks, and awards milestone achievements.

## Tech Stack

- **Framework:** Next.js 16.x with App Router and Turbopack
- **Language:** TypeScript 5.9.x (strict mode)
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **Styling:** Tailwind CSS 4.x
- **Hosting:** Vercel
- **Auth:** Strava OAuth 2.0 (no separate accounts)
- **Package Manager:** pnpm 9.x
- **Testing:** Vitest (unit/integration), Playwright (E2E), MSW (API mocking)

## Development Guidelines

### Prefer CLI Tools Over Manual Code Generation

When adding dependencies, scaffolding, or configuring tools, always use official CLI commands rather than manually generating code or configuration files. This ensures correct setup and follows recommended patterns.

Examples:

- **Adding packages:** Use `pnpm add <package>` instead of manually editing `package.json`
- **Project scaffolding:** Use `create-next-app`, `create-react-app`, or similar tools when available
- **Database migrations:** Use `pnpm db:diff` to generate migrations from schema changes
- **Type generation:** Use `pnpm db:types` to generate TypeScript types from Supabase schema
- **Adding testing libraries:** Use CLI installers like `npx playwright install` for browser binaries

## Commands

```bash
# Development
pnpm install              # Install dependencies
pnpm dev                  # Start dev server (Next.js with Turbopack)
pnpm build                # Production build
pnpm start                # Start production server

# Database (Supabase CLI via Docker)
pnpm db:start             # Start local Supabase stack
pnpm db:stop              # Stop local Supabase stack
pnpm db:reset             # Reset DB and apply migrations + seed
pnpm db:diff -f <name>    # Generate migration from local changes
pnpm db:push              # Push migrations to remote
pnpm db:types             # Generate TypeScript types from schema

# Testing
pnpm test                 # Run unit + integration tests
pnpm test:watch           # Watch mode
pnpm test:coverage        # With coverage
pnpm test:e2e             # E2E tests (Playwright)

# Run a single test file
pnpm test src/__tests__/lib/best-effort.test.ts

# Run tests matching a pattern
pnpm test -t "beatsMilestone"

# Code Quality
pnpm lint                 # ESLint
pnpm format               # Prettier
pnpm typecheck            # TypeScript type checking
```

## Architecture

### Milestone System

Five milestones based on 4:00/km pace:

- 1km (4:00), 2km (8:00), 5km (20:00), 7.5km (30:00), 10km (40:00)

Achievements are calculated using a sliding window algorithm on Strava activity streams to find the fastest segment for each distance. A single run can unlock multiple milestones.

### Webhook Processing (Async Queue Pattern)

Strava webhooks must respond within 2 seconds but only contain activity IDs. Processing flow:

1. Webhook arrives -> immediately queue in `webhook_queue` table -> respond 200 OK
2. Vercel Cron (every minute) -> fetch pending queue items -> process each:
   - Refresh Strava token if needed
   - Fetch activity streams from Strava API
   - Calculate achievements with sliding window algorithm
   - Insert new achievements to database

### Key Files

- `src/lib/best-effort.ts` - Sliding window algorithm for finding fastest segments
- `src/lib/milestones.ts` - Milestone configuration (distances, target times)
- `src/lib/timezone.ts` - Brisbane timezone helpers (seasons run Jan 1 - Dec 31 Brisbane time)
- `src/lib/process-activity.ts` - Achievement calculation logic
- `src/lib/api-auth.ts` - `withAuth` HOF for protecting API routes
- `src/app/api/webhooks/strava/route.ts` - Webhook handler (queues events)
- `src/app/api/cron/process-queue/route.ts` - Queue processor

### Route Structure

- `src/app/(app)/` - Route group for authenticated pages (feed, leaderboard, profile)
- `src/app/api/` - API routes (auth, webhooks, cron, data endpoints)
- `src/components/` - Reusable React components

### Supabase Clients

- `src/lib/supabase.ts` - Browser client (use in Client Components)
- `src/lib/supabase-server.ts` - Server client with service role (use in API routes/Server Components)

### Seasons

Seasons run January 1 - December 31 in Brisbane time (Australia/Brisbane). Each milestone can only be unlocked once per season per member.

### Database Tables

- `members` - Strava-connected users with OAuth tokens
- `achievements` - Unlocked milestones (unique per member/milestone/season)
- `reactions` - Emoji reactions on achievements
- `webhook_queue` - Async processing queue for Strava events

## Testing Strava Integration

Since Strava has no sandbox, use:

1. **Unit tests with fixtures** - Simulate activity streams in `src/__tests__/fixtures/strava-streams.ts`
2. **MSW mocks** - Mock Strava API responses for integration tests
3. **Webhook simulation** - `pnpm tsx scripts/simulate-webhook.ts --activity 123456 --athlete 789`
4. **Database seeding** - `pnpm db:reset` applies seed data for UI testing

### Local Development with Strava OAuth

Strava automatically allows `localhost` callbacks alongside your configured production domain. No need to change Strava API settings when switching between local and production - just use different `STRAVA_REDIRECT_URI` values in each environment:

- **Local:** `STRAVA_REDIRECT_URI=http://localhost:3000/api/auth/strava/callback`
- **Production:** `STRAVA_REDIRECT_URI=https://sub-40-gang.vercel.app/api/auth/strava/callback`

## Environment Variables

Required in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_VERIFY_TOKEN=
STRAVA_REDIRECT_URI=http://localhost:3000/api/auth/strava/callback
JWT_SECRET=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Prerequisites

- WSL 2 (for Windows)
- Docker Desktop (for local Supabase)
- Node.js 22.x (via nvm recommended)
- pnpm 9.x

## Git Commits

Do not include "Co-Authored-By" trailers on commits.
