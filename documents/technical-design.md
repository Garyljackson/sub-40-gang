# S40G - Technical Design Document

## Overview

This document outlines the technical architecture, implementation details, and engineering practices for S40G, a milestone achievement tracker for the Sub 40 Gang running group.

For product requirements, see the [Product Requirements Document](./s40g-prd.md).

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Tech Stack](#tech-stack)
3. [Database Design](#database-design)
4. [API Design](#api-design)
5. [Strava Integration](#strava-integration)
6. [Achievement Calculation](#achievement-calculation)
7. [Real-time Updates](#real-time-updates)
8. [Authentication & Security](#authentication--security)
9. [PWA Implementation](#pwa-implementation)
10. [Testing Strategy](#testing-strategy)
11. [Code Quality & Linting](#code-quality--linting)
12. [Deployment](#deployment)
13. [Monitoring & Observability](#monitoring--observability)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (PWA)                            │
│                    Next.js + React + Tailwind                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Vercel Edge Network                        │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Static Assets │  │   API Routes    │  │   Middleware    │ │
│  │   (Next.js)     │  │   (/api/*)      │  │   (Auth check)  │ │
│  └─────────────────┘  └────────┬────────┘  └─────────────────┘ │
└────────────────────────────────┼────────────────────────────────┘
                                 │
                      ┌──────────┴──────────┐
                      │                     │
                      ▼                     ▼
┌─────────────────────────────┐  ┌─────────────────────────────────┐
│        Supabase             │  │         Strava API              │
│  ┌───────────────────────┐  │  │                                 │
│  │     PostgreSQL        │  │  │  • OAuth Authentication         │
│  │     Database          │  │  │  • Webhook Events               │
│  └───────────────────────┘  │  │  • Activity Streams             │
│  ┌───────────────────────┐  │  │                                 │
│  │     Realtime          │  │  └─────────────────────────────────┘
│  │     Subscriptions     │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │     Auth (backup)     │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

### Request Flow: New Activity (Event-Driven Processing)

The webhook from Strava only contains the activity ID, not the full activity data. We must respond within 2 seconds, so processing is triggered asynchronously via a database trigger.

```
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│ Strava │     │ Vercel │     │Supabase│     │ Vercel │     │ Client │
│Webhook │     │  API   │     │   DB   │     │  API   │     │  PWA   │
└───┬────┘     └───┬────┘     └───┬────┘     └───┬────┘     └───┬────┘
    │              │              │              │              │
    │ POST /api/   │              │              │              │
    │ webhooks/    │              │              │              │
    │ strava       │              │              │              │
    │─────────────>│              │              │              │
    │              │              │              │              │
    │              │ INSERT into  │              │              │
    │              │ webhook_queue│              │              │
    │              │─────────────>│              │              │
    │              │              │              │              │
    │  200 OK      │              │              │              │
    │<─────────────│              │              │              │
    │              │              │              │              │
    │   (within 2 seconds)        │              │              │
    │              │              │              │              │
    │              │ AFTER INSERT │              │              │
    │              │ trigger fires│              │              │
    │              │ (pg_net)     │              │              │
    │              │──────────────────────────>│              │
    │              │              │              │              │
    │              │              │ GET /api/    │              │
    │              │              │ cron/process │              │
    │              │              │              │              │
    │              │              │ Fetch streams│              │
    │              │              │ from Strava  │              │
    │              │              │              │              │
    │              │              │ Calculate    │              │
    │              │              │ achievements │              │
    │              │              │              │              │
    │              │              │ INSERT into  │              │
    │              │              │ achievements │              │
    │              │              │<─────────────│              │
    │              │              │              │              │
    │              │              │ Realtime     │              │
    │              │              │ broadcast    │              │
    │              │              │─────────────────────────────>│
```

**Key points:**

- The database trigger (`on_webhook_queue_insert`) fires immediately on INSERT
- Uses `pg_net` extension to make async HTTP calls to the Vercel endpoint
- Processing happens within seconds of the webhook arriving
- A daily Vercel cron job serves as a fallback safety net

---

## Tech Stack

### Core Technologies

| Layer     | Technology            | Version | Justification                                                           |
| --------- | --------------------- | ------- | ----------------------------------------------------------------------- |
| Framework | Next.js               | 16.x    | App Router, Turbopack (stable), Cache Components, excellent DX          |
| Language  | TypeScript            | 5.9.x   | Type safety, better IDE support, fewer runtime errors                   |
| Database  | PostgreSQL (Supabase) | 15.x    | Relational data, realtime subscriptions, Row Level Security             |
| Styling   | Tailwind CSS          | 4.x     | Utility-first, mobile-first, CSS-native configuration, 5x faster builds |
| Hosting   | Vercel                | -       | Zero-config Next.js deploys, edge functions, analytics                  |

### Key Libraries

| Purpose           | Library               | Version  |
| ----------------- | --------------------- | -------- |
| Database Client   | @supabase/supabase-js | ^2.90.x  |
| Date Handling     | date-fns              | ^4.x     |
| Schema Validation | zod                   | ^4.x     |
| HTTP Client       | fetch (native)        | -        |
| Icons             | lucide-react          | ^0.562.x |
| Testing           | vitest                | ^4.x     |
| E2E Testing       | Playwright            | ^1.57.x  |
| API Mocking       | msw                   | ^2.x     |

### Development Tools

| Purpose         | Tool                      | Version |
| --------------- | ------------------------- | ------- |
| Package Manager | pnpm                      | 9.x     |
| Local Database  | Supabase CLI              | ^2.72.x |
| Linting         | ESLint                    | 9.x     |
| Formatting      | Prettier                  | 3.x     |
| Git Hooks       | Husky + lint-staged       | -       |
| Type Checking   | TypeScript                | 5.9.x   |
| API Mocking     | MSW (Mock Service Worker) | 2.x     |

### Local Development with Supabase CLI

The Supabase CLI allows running the entire Supabase stack locally via Docker containers. This means **no Supabase account is required for initial development**.

#### Prerequisites

- Docker Desktop (or compatible container runtime)
- Node.js 22.x (LTS)
- pnpm 9.x

#### Initial Setup

```bash
# Install dependencies
pnpm install

# Initialize Supabase (creates supabase/ folder)
pnpm supabase init

# Start local Supabase stack
pnpm supabase start
```

First run downloads Docker images (~2-3 minutes). Subsequent starts are fast.

#### Local Services

Once running, you get:

| Service  | URL                                                     | Description            |
| -------- | ------------------------------------------------------- | ---------------------- |
| API      | http://localhost:54321                                  | PostgREST API          |
| Database | postgresql://postgres:postgres@localhost:54322/postgres | Direct Postgres access |
| Studio   | http://localhost:54323                                  | Web-based database GUI |
| Inbucket | http://localhost:54324                                  | Local email testing    |

#### Environment Variables (.env.local)

```bash
# Local Supabase (from `supabase status`)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>

# Strava (required for OAuth testing)
STRAVA_CLIENT_ID=xxxxx
STRAVA_CLIENT_SECRET=xxxxx
STRAVA_VERIFY_TOKEN=local-dev-token
STRAVA_REDIRECT_URI=http://localhost:3000/api/auth/strava/callback

# Auth
JWT_SECRET=local-dev-secret-min-32-chars-long

# Cron
CRON_SECRET=local-cron-secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Database Migrations Workflow

```bash
# Apply existing migrations to local database
pnpm supabase db reset

# Make changes via Studio (http://localhost:54323)
# Or write SQL directly in a migration file

# Generate migration from local changes
pnpm supabase db diff -f <migration_name>

# View migration status
pnpm supabase migration list
```

#### Type Generation

Generate TypeScript types from your database schema:

```bash
# Generate types from local database
pnpm supabase gen types typescript --local > src/lib/database.types.ts
```

Add to package.json scripts:

```json
{
  "scripts": {
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:diff": "supabase db diff",
    "db:types": "supabase gen types typescript --local > src/lib/database.types.ts",
    "dev": "next dev --turbo"
  }
}
```

#### Testing Webhooks Locally

For Strava webhook testing during local development:

1. Use a tunnel service (ngrok, cloudflared) to expose localhost
2. Register the tunnel URL with Strava's webhook subscription
3. Or: Create test scripts that simulate webhook payloads

```bash
# Example: Simulate a webhook event locally
curl -X POST http://localhost:3000/api/webhooks/strava \
  -H "Content-Type: application/json" \
  -d '{"object_type":"activity","aspect_type":"create","object_id":12345,"owner_id":67890}'
```

#### Useful Commands

```bash
# Check status of local services
pnpm supabase status

# View logs
pnpm supabase logs

# Stop local services (data persisted)
pnpm supabase stop

# Stop and delete all data
pnpm supabase stop --no-backup

# Link to remote project (when ready to deploy)
pnpm supabase link --project-ref <project-id>

# Push local migrations to remote
pnpm supabase db push
```

---

## Database Design

### Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│      members        │       │    achievements     │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │──────<│ id (PK)             │
│ strava_athlete_id   │       │ member_id (FK)      │
│ name                │       │ milestone           │
│ profile_photo_url   │       │ season              │
│ strava_access_token │       │ strava_activity_id  │
│ strava_refresh_token│       │ achieved_at         │
│ token_expires_at    │       │ distance            │
│ joined_at           │       │ time_seconds        │
│ created_at          │       │ created_at          │
│ updated_at          │       └──────────┬──────────┘
└────────┬────────────┘                  │
         │                               │
         │                    ┌──────────┴──────────┐
         │                    │     reactions       │
         │                    ├─────────────────────┤
         │                    │ id (PK)             │
         │                    │ achievement_id (FK) │
         │                    │ member_id (FK)      │
         │                    │ emoji               │
         │                    │ created_at          │
         │                    └─────────────────────┘
         │
         │  ┌─────────────────────────┐
         └─<│  processed_activities   │  (Last synced run visibility)
            ├─────────────────────────┤
            │ id (PK)                 │
            │ member_id (FK)          │
            │ strava_activity_id      │
            │ activity_name           │
            │ activity_date           │
            │ distance_meters         │
            │ moving_time_seconds     │
            │ pace_seconds_per_km     │
            │ milestones_unlocked[]   │
            │ processed_at            │
            └─────────────────────────┘

┌─────────────────────┐
│   webhook_queue     │  (Async processing)
├─────────────────────┤
│ id (PK)             │
│ strava_activity_id  │
│ strava_athlete_id   │
│ event_type          │
│ status              │
│ attempts            │
│ error_message       │
│ created_at          │
│ processed_at        │
└─────────────────────┘
```

### Schema Definition

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Milestone enum
CREATE TYPE milestone_type AS ENUM ('1km', '2km', '5km', '7.5km', '10km');

-- Members table
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strava_athlete_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    profile_photo_url TEXT,
    strava_access_token TEXT NOT NULL,
    strava_refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Achievements table
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    milestone milestone_type NOT NULL,
    season INTEGER NOT NULL,
    strava_activity_id VARCHAR(255) NOT NULL,
    achieved_at TIMESTAMPTZ NOT NULL,
    distance DECIMAL(10, 2) NOT NULL, -- actual distance in meters
    time_seconds INTEGER NOT NULL,    -- actual time in seconds
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One achievement per milestone per member per season
    UNIQUE(member_id, milestone, season)
);

-- Reactions table
CREATE TABLE reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One reaction per member per achievement
    UNIQUE(achievement_id, member_id)
);

-- Webhook queue table (for async processing)
CREATE TYPE queue_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE webhook_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strava_activity_id VARCHAR(255) NOT NULL,
    strava_athlete_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    status queue_status NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,

    -- Prevent duplicate queue entries for same activity
    UNIQUE(strava_activity_id)
);

-- Processed activities table (for "last synced run" visibility)
CREATE TABLE processed_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    strava_activity_id VARCHAR(255) NOT NULL,
    activity_name VARCHAR(255) NOT NULL,
    activity_date TIMESTAMPTZ NOT NULL,
    distance_meters DECIMAL(10, 2) NOT NULL,
    moving_time_seconds INTEGER NOT NULL,
    pace_seconds_per_km INTEGER NOT NULL,  -- calculated: moving_time / (distance/1000)
    milestones_unlocked VARCHAR(50)[] DEFAULT '{}',  -- e.g., ['1km', '2km']
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One entry per activity
    UNIQUE(strava_activity_id)
);

-- Indexes
CREATE INDEX idx_achievements_member_id ON achievements(member_id);
CREATE INDEX idx_achievements_season ON achievements(season);
CREATE INDEX idx_achievements_created_at ON achievements(created_at DESC);
CREATE INDEX idx_reactions_achievement_id ON reactions(achievement_id);
CREATE INDEX idx_members_strava_athlete_id ON members(strava_athlete_id);
CREATE INDEX idx_webhook_queue_status ON webhook_queue(status) WHERE status = 'pending';
CREATE INDEX idx_webhook_queue_created_at ON webhook_queue(created_at);
CREATE INDEX idx_processed_activities_member_id ON processed_activities(member_id);
CREATE INDEX idx_processed_activities_processed_at ON processed_activities(member_id, processed_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Members: All authenticated users can read, users can only update their own
CREATE POLICY "Members are viewable by all authenticated users"
    ON members FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Members can update their own record"
    ON members FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- Achievements: All authenticated users can read
CREATE POLICY "Achievements are viewable by all authenticated users"
    ON achievements FOR SELECT
    TO authenticated
    USING (true);

-- Reactions: All authenticated users can read, users can manage their own
CREATE POLICY "Reactions are viewable by all authenticated users"
    ON reactions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can create their own reactions"
    ON reactions FOR INSERT
    TO authenticated
    WITH CHECK (member_id = auth.uid());

CREATE POLICY "Users can delete their own reactions"
    ON reactions FOR DELETE
    TO authenticated
    USING (member_id = auth.uid());
```

---

## API Design

### Endpoints Overview

| Method | Endpoint                       | Description                                   | Auth     |
| ------ | ------------------------------ | --------------------------------------------- | -------- |
| GET    | `/api/auth/strava`             | Initiate Strava OAuth                         | No       |
| GET    | `/api/auth/strava/callback`    | Handle OAuth callback                         | No       |
| POST   | `/api/auth/logout`             | Clear session                                 | Yes      |
| GET    | `/api/webhooks/strava`         | Webhook verification                          | No       |
| POST   | `/api/webhooks/strava`         | Receive activity events (queues for async)    | No\*     |
| GET    | `/api/cron/process-queue`      | Process webhook queue (called by Vercel Cron) | Cron\*\* |
| GET    | `/api/feed`                    | Get activity feed                             | Yes      |
| GET    | `/api/leaderboard`             | Get current season leaderboard                | Yes      |
| GET    | `/api/profile`                 | Get current user profile                      | Yes      |
| GET    | `/api/profile/recent-activity` | Get user's most recent synced run             | Yes      |
| GET    | `/api/members/:id`             | Get member profile                            | Yes      |
| POST   | `/api/reactions`               | Add reaction                                  | Yes      |
| DELETE | `/api/reactions/:id`           | Remove reaction                               | Yes      |

\*Webhook endpoint uses Strava's verification token instead of user auth.
\*\*Cron endpoint is protected by `CRON_SECRET` environment variable.

### Request/Response Schemas

#### Feed Response

```typescript
// GET /api/feed?page=1&limit=20

interface FeedResponse {
  data: Achievement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

interface Achievement {
  id: string;
  member: {
    id: string;
    name: string;
    profilePhotoUrl: string | null;
  };
  milestone: '1km' | '2km' | '5km' | '7.5km' | '10km';
  achievedAt: string; // ISO 8601
  distance: number; // meters
  timeSeconds: number;
  reactions: Reaction[];
  createdAt: string; // ISO 8601
}

interface Reaction {
  id: string;
  memberId: string;
  emoji: string;
}
```

#### Leaderboard Response

```typescript
// GET /api/leaderboard

interface LeaderboardResponse {
  season: number;
  members: LeaderboardMember[];
}

interface LeaderboardMember {
  id: string;
  name: string;
  profilePhotoUrl: string | null;
  milestones: {
    '1km': boolean;
    '2km': boolean;
    '5km': boolean;
    '7.5km': boolean;
    '10km': boolean;
  };
  totalUnlocked: number;
}
```

#### Recent Activity Response

```typescript
// GET /api/profile/recent-activity

interface RecentActivityResponse {
  activity: RecentActivity | null; // null if no activities synced yet
}

interface RecentActivity {
  id: string;
  stravaActivityId: string;
  activityName: string; // e.g., "Morning Run"
  activityDate: string; // ISO 8601
  distanceMeters: number;
  movingTimeSeconds: number;
  paceSecondsPerKm: number; // calculated pace
  milestonesUnlocked: string[]; // e.g., ['1km', '2km'] or []
  processedAt: string; // ISO 8601 - when S40G processed it
}

// Example response:
// {
//   "activity": {
//     "id": "abc123",
//     "stravaActivityId": "12345678",
//     "activityName": "Morning Run",
//     "activityDate": "2026-01-25T07:30:00Z",
//     "distanceMeters": 5234.5,
//     "movingTimeSeconds": 1245,
//     "paceSecondsPerKm": 238,
//     "milestonesUnlocked": ["5km"],
//     "processedAt": "2026-01-25T07:45:00Z"
//   }
// }
```

#### Reaction Request

```typescript
// POST /api/reactions

interface CreateReactionRequest {
  achievementId: string;
  emoji: string; // Must be one of: 🎉, 🔥, 💪, 👏
}

interface CreateReactionResponse {
  id: string;
  achievementId: string;
  memberId: string;
  emoji: string;
  createdAt: string;
}
```

### Error Handling

All API errors follow a consistent format:

```typescript
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

Standard error codes:

| HTTP Status | Code             | Description                        |
| ----------- | ---------------- | ---------------------------------- |
| 400         | `BAD_REQUEST`    | Invalid request body or parameters |
| 401         | `UNAUTHORIZED`   | Missing or invalid authentication  |
| 403         | `FORBIDDEN`      | User lacks permission              |
| 404         | `NOT_FOUND`      | Resource not found                 |
| 409         | `CONFLICT`       | Resource already exists            |
| 429         | `RATE_LIMITED`   | Too many requests                  |
| 500         | `INTERNAL_ERROR` | Unexpected server error            |

---

## Strava Integration

### Overview

Strava integration uses an **event-driven async processing pattern** for handling webhook events:

1. **Webhook arrives** → Contains only activity ID and athlete ID (no activity data)
2. **Immediate response** → Must respond with 200 OK within 2 seconds
3. **Queue for processing** → Event is stored in `webhook_queue` table
4. **Database trigger fires** → `pg_net` immediately calls the processing endpoint
5. **Fetch activity streams** → Requires token refresh and API calls to Strava

This pattern is necessary because:

- Strava webhooks don't include activity data, only IDs
- We need to make additional API calls to fetch streams
- Token refresh may be required if the user's token has expired
- All of this can't reliably complete within 2 seconds

### OAuth Flow

```typescript
// Environment variables
STRAVA_CLIENT_ID=xxxxx
STRAVA_CLIENT_SECRET=xxxxx
STRAVA_REDIRECT_URI=https://s40g.app/api/auth/strava/callback

// Scopes required
const STRAVA_SCOPES = 'read,activity:read';
```

#### Authorization URL

```typescript
// GET /api/auth/strava

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: process.env.STRAVA_REDIRECT_URI!,
    response_type: 'code',
    scope: 'read,activity:read',
  });

  return Response.redirect(`https://www.strava.com/oauth/authorize?${params}`);
}
```

#### Token Exchange

```typescript
// GET /api/auth/strava/callback?code=xxx

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
    profile: string;
  };
}
```

### Token Refresh

```typescript
async function refreshStravaToken(member: Member): Promise<string> {
  // Check if token is expired (with 5 min buffer)
  const now = Date.now() / 1000;
  if (member.tokenExpiresAt > now + 300) {
    return member.stravaAccessToken;
  }

  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: member.stravaRefreshToken,
    }),
  });

  const data = await response.json();

  // Update tokens in database
  await supabase
    .from('members')
    .update({
      strava_access_token: data.access_token,
      strava_refresh_token: data.refresh_token,
      token_expires_at: new Date(data.expires_at * 1000).toISOString(),
    })
    .eq('id', member.id);

  return data.access_token;
}
```

### Webhook Setup

#### Verification Endpoint

```typescript
// GET /api/webhooks/strava

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.STRAVA_VERIFY_TOKEN) {
    return Response.json({ 'hub.challenge': challenge });
  }

  return new Response('Forbidden', { status: 403 });
}
```

#### Event Handler (Queue-based)

The webhook handler must respond within 2 seconds. Since Strava webhooks only contain the activity ID (not the full data), we queue events for async processing.

```typescript
// POST /api/webhooks/strava

interface StravaWebhookEvent {
  aspect_type: 'create' | 'update' | 'delete';
  event_time: number;
  object_id: number; // Activity ID
  object_type: 'activity' | 'athlete';
  owner_id: number; // Athlete ID
  subscription_id: number;
  updates?: Record<string, unknown>;
}

export async function POST(request: Request) {
  const event: StravaWebhookEvent = await request.json();

  // Only process new activities
  if (event.object_type !== 'activity' || event.aspect_type !== 'create') {
    return Response.json({ received: true });
  }

  // Check if athlete is a member
  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('strava_athlete_id', String(event.owner_id))
    .single();

  if (!member) {
    // Not a registered member, ignore
    return Response.json({ received: true });
  }

  // Queue for async processing (upsert to handle retries)
  await supabase.from('webhook_queue').upsert(
    {
      strava_activity_id: String(event.object_id),
      strava_athlete_id: String(event.owner_id),
      event_type: event.aspect_type,
      status: 'pending',
    },
    {
      onConflict: 'strava_activity_id',
      ignoreDuplicates: true,
    }
  );

  return Response.json({ received: true });
}
```

#### Queue Processor (Event-Driven + Fallback Cron)

The queue processor is triggered immediately via a database trigger when webhooks arrive. A daily Vercel cron job serves as a fallback.

```typescript
// GET /api/cron/process-queue

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Fetch pending items (limit batch size)
  const { data: pendingItems } = await supabase
    .from('webhook_queue')
    .select('*')
    .eq('status', 'pending')
    .lt('attempts', 3)
    .order('created_at', { ascending: true })
    .limit(10);

  if (!pendingItems?.length) {
    return Response.json({ processed: 0 });
  }

  let processed = 0;

  for (const item of pendingItems) {
    try {
      // Mark as processing
      await supabase
        .from('webhook_queue')
        .update({ status: 'processing', attempts: item.attempts + 1 })
        .eq('id', item.id);

      // Process the activity
      await processActivity(item.strava_activity_id, item.strava_athlete_id);

      // Mark as completed
      await supabase
        .from('webhook_queue')
        .update({ status: 'completed', processed_at: new Date().toISOString() })
        .eq('id', item.id);

      processed++;
    } catch (error) {
      // Mark as failed (or pending for retry if attempts < max)
      const newStatus = item.attempts + 1 >= 3 ? 'failed' : 'pending';
      await supabase
        .from('webhook_queue')
        .update({
          status: newStatus,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', item.id);
    }
  }

  return Response.json({ processed });
}

async function processActivity(activityId: string, athleteId: string) {
  // 1. Get member and refresh token if needed
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('strava_athlete_id', athleteId)
    .single();

  if (!member) throw new Error('Member not found');

  const accessToken = await refreshStravaToken(member);

  // 2. Fetch activity details
  const activityResponse = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const activity = await activityResponse.json();

  // Only process runs
  if (activity.type !== 'Run') return;

  // Check if activity is within current season and after member join date
  const activityDate = new Date(activity.start_date);
  if (activityDate < new Date(member.joined_at)) return;

  // 3. Fetch activity streams
  const streams = await fetchActivityStreams(activityId, accessToken);

  // 4. Process activity and calculate achievements
  await processActivityData(member.id, {
    activityId,
    activityName: activity.name,
    activityDate,
    distanceMeters: activity.distance,
    movingTimeSeconds: activity.moving_time,
    timeStream: streams.time.data,
    distanceStream: streams.distance.data,
  });
}
```

### Activity Streams

```typescript
interface StreamData {
  time: { data: number[]; original_size: number };
  distance: { data: number[]; original_size: number };
}

async function fetchActivityStreams(activityId: string, accessToken: string): Promise<StreamData> {
  const response = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=time,distance&key_by_type=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch streams: ${response.status}`);
  }

  return response.json();
}
```

---

## Achievement Calculation

### Milestone Configuration

```typescript
// src/lib/milestones.ts

export const MILESTONES = {
  '1km': { distance: 1000, targetTime: 240 },
  '2km': { distance: 2000, targetTime: 480 },
  '5km': { distance: 5000, targetTime: 1200 },
  '7.5km': { distance: 7500, targetTime: 1800 },
  '10km': { distance: 10000, targetTime: 2400 },
} as const;

export type MilestoneKey = keyof typeof MILESTONES;
```

### Timezone Configuration

Seasons run January 1 - December 31 in **Brisbane time (Australia/Brisbane)**. This ensures local runners experience season boundaries at their midnight, not UTC.

```typescript
// src/lib/timezone.ts

export const APP_TIMEZONE = 'Australia/Brisbane';

/**
 * Get the season (year) for a given date in Brisbane time.
 *
 * Example:
 *   - 2026-12-31T23:30:00 Brisbane = season 2026
 *   - 2027-01-01T00:30:00 Brisbane = season 2027
 *   - 2026-12-31T14:00:00 UTC (= 2027-01-01T00:00 Brisbane) = season 2027
 */
export function getSeasonForDate(date: Date): number {
  // Format the date in Brisbane timezone and extract the year
  const brisbaneDate = new Intl.DateTimeFormat('en-AU', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
  }).format(date);

  return parseInt(brisbaneDate, 10);
}

/**
 * Get the current season in Brisbane time.
 */
export function getCurrentSeason(): number {
  return getSeasonForDate(new Date());
}
```

### Sliding Window Algorithm

```typescript
// src/lib/best-effort.ts

interface BestEffort {
  distance: number;
  timeSeconds: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Find the fastest segment of at least targetDistance meters
 * using a two-pointer sliding window approach.
 *
 * Time complexity: O(n)
 * Space complexity: O(1)
 */
export function findBestEffort(
  timeStream: number[],
  distanceStream: number[],
  targetDistance: number
): BestEffort | null {
  if (timeStream.length !== distanceStream.length) {
    throw new Error('Streams must have equal length');
  }

  if (timeStream.length === 0) {
    return null;
  }

  // Check if total distance covers target
  const totalDistance = distanceStream[distanceStream.length - 1];
  if (totalDistance < targetDistance) {
    return null;
  }

  let bestTime = Infinity;
  let bestStart = 0;
  let bestEnd = 0;
  let j = 0;

  for (let i = 0; i < distanceStream.length; i++) {
    // Move j forward until we have at least targetDistance
    while (j < distanceStream.length && distanceStream[j] - distanceStream[i] < targetDistance) {
      j++;
    }

    // If we found a valid segment
    if (j < distanceStream.length) {
      const segmentTime = timeStream[j] - timeStream[i];
      if (segmentTime < bestTime) {
        bestTime = segmentTime;
        bestStart = i;
        bestEnd = j;
      }
    }
  }

  if (bestTime === Infinity) {
    return null;
  }

  return {
    distance: distanceStream[bestEnd] - distanceStream[bestStart],
    timeSeconds: bestTime,
    startIndex: bestStart,
    endIndex: bestEnd,
  };
}
```

### Achievement Processing

```typescript
// src/lib/process-activity.ts

import { MILESTONES, MilestoneKey } from './milestones';
import { findBestEffort } from './best-effort';
import { getSeasonForDate } from './timezone';

interface ActivityData {
  activityId: string;
  activityName: string;
  activityDate: Date;
  distanceMeters: number;
  movingTimeSeconds: number;
  timeStream: number[];
  distanceStream: number[];
}

interface NewAchievement {
  milestone: MilestoneKey;
  distance: number;
  timeSeconds: number;
}

export async function processActivity(
  memberId: string,
  activity: ActivityData
): Promise<NewAchievement[]> {
  const {
    activityId,
    activityName,
    activityDate,
    distanceMeters,
    movingTimeSeconds,
    timeStream,
    distanceStream,
  } = activity;

  // Calculate season based on Brisbane time, not UTC
  const season = getSeasonForDate(activityDate);
  const newAchievements: NewAchievement[] = [];

  // Get existing achievements for this member and season
  const { data: existingAchievements } = await supabase
    .from('achievements')
    .select('milestone')
    .eq('member_id', memberId)
    .eq('season', season);

  const existingMilestones = new Set(existingAchievements?.map((a) => a.milestone) ?? []);

  // Check each milestone
  for (const [key, config] of Object.entries(MILESTONES)) {
    const milestone = key as MilestoneKey;

    // Skip if already achieved
    if (existingMilestones.has(milestone)) {
      continue;
    }

    // Find best effort for this distance
    const bestEffort = findBestEffort(timeStream, distanceStream, config.distance);

    // Check if it meets the target
    if (bestEffort && bestEffort.timeSeconds <= config.targetTime) {
      newAchievements.push({
        milestone,
        distance: bestEffort.distance,
        timeSeconds: bestEffort.timeSeconds,
      });
    }
  }

  // Insert new achievements
  if (newAchievements.length > 0) {
    await supabase.from('achievements').insert(
      newAchievements.map((a) => ({
        member_id: memberId,
        milestone: a.milestone,
        season,
        strava_activity_id: activityId,
        achieved_at: activityDate.toISOString(),
        distance: a.distance,
        time_seconds: a.timeSeconds,
      }))
    );
  }

  // Calculate pace (seconds per km)
  const paceSecondsPerKm =
    distanceMeters > 0 ? Math.round(movingTimeSeconds / (distanceMeters / 1000)) : 0;

  // Store in processed_activities for "last synced run" visibility
  await supabase.from('processed_activities').upsert(
    {
      member_id: memberId,
      strava_activity_id: activityId,
      activity_name: activityName,
      activity_date: activityDate.toISOString(),
      distance_meters: distanceMeters,
      moving_time_seconds: movingTimeSeconds,
      pace_seconds_per_km: paceSecondsPerKm,
      milestones_unlocked: newAchievements.map((a) => a.milestone),
      processed_at: new Date().toISOString(),
    },
    {
      onConflict: 'strava_activity_id',
    }
  );

  return newAchievements;
}
```

---

## Real-time Updates

### Supabase Realtime Configuration

```typescript
// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Client-Side Subscription

```typescript
// src/hooks/use-feed-subscription.ts

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useFeedSubscription(onNewAchievement: (achievement: Achievement) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('achievements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'achievements',
        },
        async (payload) => {
          // Fetch full achievement with member data
          const { data } = await supabase
            .from('achievements')
            .select(
              `
              *,
              member:members(id, name, profile_photo_url)
            `
            )
            .eq('id', payload.new.id)
            .single();

          if (data) {
            onNewAchievement(data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNewAchievement]);
}
```

---

## Authentication & Security

### Session Management

Sessions are managed using HTTP-only cookies with JWTs:

```typescript
// src/lib/auth.ts

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = 's40g_session';

interface SessionPayload {
  memberId: string;
  stravaAthleteId: string;
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  cookies().delete(COOKIE_NAME);
}
```

### API Route Protection

```typescript
// src/lib/api-auth.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './auth';

export function withAuth(
  handler: (req: NextRequest, session: SessionPayload) => Promise<Response>
) {
  return async (req: NextRequest) => {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    return handler(req, session);
  };
}
```

### Security Headers

```typescript
// next.config.js

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### Environment Variables

```bash
# .env.local (never commit)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# Strava
STRAVA_CLIENT_ID=xxxxx
STRAVA_CLIENT_SECRET=xxxxx
STRAVA_VERIFY_TOKEN=xxxxx
STRAVA_REDIRECT_URI=http://localhost:3000/api/auth/strava/callback

# Auth
JWT_SECRET=xxxxx

# Cron Jobs (Vercel sets this automatically, but needed for local dev)
CRON_SECRET=xxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## PWA Implementation

### Web App Manifest

```json
// public/manifest.json

{
  "name": "S40G - Sub 40 Gang",
  "short_name": "S40G",
  "description": "Track your progress to running 10km in under 40 minutes",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#10b981",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Service Worker

```typescript
// public/sw.js

const CACHE_NAME = 's40g-v1';
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

// Fetch: network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API requests
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/offline');
        });
      })
  );
});
```

### Add to Home Screen Prompt

```typescript
// src/hooks/use-install-prompt.ts

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!promptEvent) return false;

    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    setPromptEvent(null);

    if (outcome === 'accepted') {
      setIsInstalled(true);
      return true;
    }
    return false;
  };

  return { canInstall: !!promptEvent, isInstalled, install };
}
```

---

## Testing Strategy

### Testing Pyramid

```
          ┌─────────────┐
          │    E2E      │  5%   - Critical user journeys
          │ (Playwright)│
         ─┼─────────────┼─
         │  Integration  │  25%  - API routes, DB queries
         │   (Vitest)    │
        ─┼───────────────┼─
        │     Unit       │  70%  - Functions, components
        │    (Vitest)    │
       ─┴────────────────┴─
```

### Unit Tests

```typescript
// src/__tests__/lib/best-effort.test.ts

import { describe, it, expect } from 'vitest';
import { findBestEffort } from '@/lib/best-effort';

describe('findBestEffort', () => {
  it('returns null when total distance is less than target', () => {
    const time = [0, 60, 120];
    const distance = [0, 500, 900];

    const result = findBestEffort(time, distance, 1000);

    expect(result).toBeNull();
  });

  it('finds the best effort when run exactly matches target distance', () => {
    const time = [0, 60, 120, 180, 240];
    const distance = [0, 250, 500, 750, 1000];

    const result = findBestEffort(time, distance, 1000);

    expect(result).toEqual({
      distance: 1000,
      timeSeconds: 240,
      startIndex: 0,
      endIndex: 4,
    });
  });

  it('finds fastest segment in a longer run', () => {
    // 3km run where the middle 1km is fastest
    const time = [0, 120, 180, 240, 300, 420]; // seconds
    const distance = [0, 500, 1000, 1500, 2000, 3000]; // meters

    const result = findBestEffort(time, distance, 1000);

    // Middle segment: 500m to 1500m in 120s (indices 1-3)
    expect(result?.timeSeconds).toBe(120);
  });

  it('handles empty streams', () => {
    const result = findBestEffort([], [], 1000);
    expect(result).toBeNull();
  });

  it('throws when streams have different lengths', () => {
    expect(() => findBestEffort([0, 1], [0], 1000)).toThrow();
  });
});
```

```typescript
// src/__tests__/lib/timezone.test.ts

import { describe, it, expect } from 'vitest';
import { getSeasonForDate, getCurrentSeason } from '@/lib/timezone';

describe('getSeasonForDate', () => {
  it('returns correct season for mid-year date', () => {
    const date = new Date('2026-06-15T12:00:00Z');
    expect(getSeasonForDate(date)).toBe(2026);
  });

  it('handles NYE in Brisbane (still 2026)', () => {
    // Dec 31, 2026 at 11:30pm Brisbane time = Dec 31, 2026 13:30 UTC
    const date = new Date('2026-12-31T13:30:00Z');
    expect(getSeasonForDate(date)).toBe(2026);
  });

  it('handles NY Day in Brisbane (now 2027)', () => {
    // Jan 1, 2027 at 12:30am Brisbane time = Dec 31, 2026 14:30 UTC
    const date = new Date('2026-12-31T14:30:00Z');
    expect(getSeasonForDate(date)).toBe(2027);
  });

  it('handles UTC midnight on Jan 1 (already 10am in Brisbane)', () => {
    // UTC midnight Jan 1 = 10am Jan 1 Brisbane (AEST, +10)
    const date = new Date('2027-01-01T00:00:00Z');
    expect(getSeasonForDate(date)).toBe(2027);
  });
});
```

### Integration Tests

```typescript
// src/__tests__/api/feed.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { GET } from '@/app/api/feed/route';
import { supabase } from '@/lib/supabase';

describe('GET /api/feed', () => {
  beforeEach(async () => {
    // Seed test data
    await supabase.from('members').insert({
      id: 'test-member-1',
      strava_athlete_id: '12345',
      name: 'Test Runner',
      // ...
    });

    await supabase.from('achievements').insert({
      member_id: 'test-member-1',
      milestone: '5km',
      season: 2026,
      // ...
    });
  });

  afterEach(async () => {
    // Clean up
    await supabase.from('achievements').delete().neq('id', '');
    await supabase.from('members').delete().neq('id', '');
  });

  it('returns paginated achievements', async () => {
    const { req } = createMocks({
      method: 'GET',
      url: '/api/feed?page=1&limit=10',
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(1);
    expect(data.pagination.page).toBe(1);
  });

  it('returns 401 without authentication', async () => {
    // Mock no session
    const { req } = createMocks({ method: 'GET' });

    const response = await GET(req);

    expect(response.status).toBe(401);
  });
});
```

### E2E Tests

```typescript
// e2e/onboarding.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test('user can sign in with Strava', async ({ page }) => {
    await page.goto('/');

    // Should see sign in button
    await expect(page.getByRole('button', { name: /sign in with strava/i })).toBeVisible();

    // Click should redirect to Strava
    await page.getByRole('button', { name: /sign in with strava/i }).click();

    // Should be on Strava domain
    await expect(page).toHaveURL(/strava\.com/);
  });

  test('authenticated user sees activity feed', async ({ page }) => {
    // Use authenticated state
    await page.goto('/', { storageState: 'e2e/.auth/user.json' });

    // Should see feed
    await expect(page.getByRole('heading', { name: /activity feed/i })).toBeVisible();

    // Should see leaderboard link
    await expect(page.getByRole('link', { name: /leaderboard/i })).toBeVisible();
  });
});
```

### Strava Integration Testing

Since Strava doesn't provide a sandbox environment, we use a multi-layered testing approach:

#### 1. Unit Tests with Fixture Data (No API needed)

The core achievement calculation logic can be tested entirely offline using fixture data that simulates Strava activity streams.

```typescript
// src/__tests__/fixtures/strava-streams.ts

// Simulates a 5km run at exactly 4:00/km pace (sub-40 qualifying)
export const FAST_5K_STREAMS = {
  time: { data: Array.from({ length: 1201 }, (_, i) => i) }, // 0-1200 seconds
  distance: { data: Array.from({ length: 1201 }, (_, i) => i * 4.167) }, // 5000m in 1200s
};

// Simulates a 10km run with variable pace (fast middle section)
export const VARIABLE_10K_STREAMS = {
  time: {
    data: [
      ...Array.from({ length: 601 }, (_, i) => i), // 0-600s: first 2.5km at 4:00/km
      ...Array.from({ length: 481 }, (_, i) => 600 + i), // 600-1080s: middle 2km at 4:00/km
      ...Array.from({ length: 601 }, (_, i) => 1080 + i * 1.2), // 1080-1800s: last 5.5km slower
    ],
  },
  distance: {
    data: [
      ...Array.from({ length: 601 }, (_, i) => i * 4.167), // 2500m
      ...Array.from({ length: 481 }, (_, i) => 2500 + i * 4.167), // 4500m
      ...Array.from({ length: 601 }, (_, i) => 4500 + i * 9.17), // 10000m
    ],
  },
};

// Simulates a slow run (no milestones should be achieved)
export const SLOW_5K_STREAMS = {
  time: { data: Array.from({ length: 1501 }, (_, i) => i) }, // 25 minutes
  distance: { data: Array.from({ length: 1501 }, (_, i) => i * 3.33) }, // 5km
};
```

```typescript
// src/__tests__/lib/calculate-achievements.test.ts

import { describe, it, expect } from 'vitest';
import { calculateAchievements } from '@/lib/process-activity';
import { MILESTONES } from '@/lib/milestones';
import { FAST_5K_STREAMS, VARIABLE_10K_STREAMS, SLOW_5K_STREAMS } from '../fixtures/strava-streams';

describe('calculateAchievements', () => {
  it('awards all achievable milestones for a fast 5km', () => {
    const achievements = calculateAchievements(
      FAST_5K_STREAMS.time.data,
      FAST_5K_STREAMS.distance.data,
      [] // no existing achievements
    );

    expect(achievements).toHaveLength(3); // 1km, 2km, 5km
    expect(achievements.map((a) => a.milestone)).toEqual(['1km', '2km', '5km']);
  });

  it('finds best segment in variable pace run', () => {
    const achievements = calculateAchievements(
      VARIABLE_10K_STREAMS.time.data,
      VARIABLE_10K_STREAMS.distance.data,
      []
    );

    // Should find the fast middle section for 2km milestone
    const twoKm = achievements.find((a) => a.milestone === '2km');
    expect(twoKm?.timeSeconds).toBeLessThanOrEqual(480); // Under 8 minutes
  });

  it('awards no milestones for slow run', () => {
    const achievements = calculateAchievements(
      SLOW_5K_STREAMS.time.data,
      SLOW_5K_STREAMS.distance.data,
      []
    );

    expect(achievements).toHaveLength(0);
  });

  it('skips already achieved milestones', () => {
    const existing = [{ milestone: '1km', season: 2026 }];

    const achievements = calculateAchievements(
      FAST_5K_STREAMS.time.data,
      FAST_5K_STREAMS.distance.data,
      existing
    );

    expect(achievements.map((a) => a.milestone)).not.toContain('1km');
  });
});
```

#### 2. API Mocking with MSW (Mock Service Worker)

For integration tests, mock Strava API responses without hitting the real API.

```typescript
// src/__tests__/mocks/handlers.ts

import { http, HttpResponse } from 'msw';

export const stravaHandlers = [
  // Mock OAuth token exchange
  http.post('https://www.strava.com/oauth/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 21600,
      athlete: {
        id: 12345,
        firstname: 'Test',
        lastname: 'Runner',
        profile: 'https://example.com/avatar.jpg',
      },
    });
  }),

  // Mock activity details
  http.get('https://www.strava.com/api/v3/activities/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'Morning Run',
      type: 'Run',
      start_date: '2026-01-15T07:00:00Z',
      distance: 5000,
      moving_time: 1180,
    });
  }),

  // Mock activity streams
  http.get('https://www.strava.com/api/v3/activities/:id/streams', () => {
    return HttpResponse.json({
      time: { data: Array.from({ length: 1181 }, (_, i) => i) },
      distance: { data: Array.from({ length: 1181 }, (_, i) => i * 4.24) },
    });
  }),

  // Mock token refresh
  http.post('https://www.strava.com/oauth/token', async ({ request }) => {
    const body = await request.json();
    if (body.grant_type === 'refresh_token') {
      return HttpResponse.json({
        access_token: 'new-mock-access-token',
        refresh_token: 'new-mock-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 21600,
      });
    }
  }),
];

// src/__tests__/mocks/server.ts
import { setupServer } from 'msw/node';
import { stravaHandlers } from './handlers';

export const server = setupServer(...stravaHandlers);

// vitest.setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from '@/__tests__/mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

#### 3. Webhook Simulation Scripts

Test webhook processing locally without actual Strava events.

```typescript
// scripts/simulate-webhook.ts

/**
 * Simulates a Strava webhook event for local testing.
 *
 * Usage:
 *   pnpm tsx scripts/simulate-webhook.ts --activity 123456 --athlete 789
 *   pnpm tsx scripts/simulate-webhook.ts --type update --activity 123456
 */

import { parseArgs } from 'util';

const { values } = parseArgs({
  options: {
    activity: { type: 'string', default: '1234567890' },
    athlete: { type: 'string', default: '12345' },
    type: { type: 'string', default: 'create' },
    url: { type: 'string', default: 'http://localhost:3000/api/webhooks/strava' },
  },
});

const payload = {
  object_type: 'activity',
  aspect_type: values.type,
  object_id: parseInt(values.activity!),
  owner_id: parseInt(values.athlete!),
  subscription_id: 999999,
  event_time: Math.floor(Date.now() / 1000),
};

console.log('Sending webhook:', payload);

const response = await fetch(values.url!, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

console.log('Response:', response.status, await response.json());
```

```bash
# Quick webhook test commands
curl -X POST http://localhost:3000/api/webhooks/strava \
  -H "Content-Type: application/json" \
  -d '{"object_type":"activity","aspect_type":"create","object_id":12345,"owner_id":67890,"subscription_id":1,"event_time":1706000000}'
```

#### 4. Database Seeding for UI Testing

Seed the local database with realistic test data to develop and test the UI without needing Strava.

```sql
-- supabase/seed.sql

-- Test members (no real Strava tokens needed for UI testing)
INSERT INTO members (id, strava_athlete_id, name, profile_photo_url, strava_access_token, strava_refresh_token, token_expires_at, joined_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '10001', 'Alice Runner', 'https://via.placeholder.com/150', 'fake-token', 'fake-refresh', NOW() + INTERVAL '1 day', '2026-01-01'),
  ('22222222-2222-2222-2222-222222222222', '10002', 'Bob Jogger', 'https://via.placeholder.com/150', 'fake-token', 'fake-refresh', NOW() + INTERVAL '1 day', '2026-01-05'),
  ('33333333-3333-3333-3333-333333333333', '10003', 'Charlie Sprinter', 'https://via.placeholder.com/150', 'fake-token', 'fake-refresh', NOW() + INTERVAL '1 day', '2026-01-10');

-- Test achievements (various milestones for leaderboard testing)
INSERT INTO achievements (member_id, milestone, season, strava_activity_id, achieved_at, distance, time_seconds)
VALUES
  -- Alice: All milestones
  ('11111111-1111-1111-1111-111111111111', '1km', 2026, 'act-1001', '2026-01-02 08:00:00', 1000, 235),
  ('11111111-1111-1111-1111-111111111111', '2km', 2026, 'act-1002', '2026-01-05 08:00:00', 2000, 472),
  ('11111111-1111-1111-1111-111111111111', '5km', 2026, 'act-1003', '2026-01-10 08:00:00', 5000, 1185),
  ('11111111-1111-1111-1111-111111111111', '7.5km', 2026, 'act-1004', '2026-01-15 08:00:00', 7500, 1780),
  ('11111111-1111-1111-1111-111111111111', '10km', 2026, 'act-1005', '2026-01-20 08:00:00', 10000, 2380),

  -- Bob: Partial progress
  ('22222222-2222-2222-2222-222222222222', '1km', 2026, 'act-2001', '2026-01-06 09:00:00', 1000, 238),
  ('22222222-2222-2222-2222-222222222222', '2km', 2026, 'act-2002', '2026-01-10 09:00:00', 2000, 478),

  -- Charlie: Just started
  ('33333333-3333-3333-3333-333333333333', '1km', 2026, 'act-3001', '2026-01-12 07:00:00', 1000, 239);

-- Test reactions
INSERT INTO reactions (achievement_id, member_id, emoji)
SELECT a.id, '22222222-2222-2222-2222-222222222222', '🔥'
FROM achievements a WHERE a.member_id = '11111111-1111-1111-1111-111111111111' AND a.milestone = '10km';
```

```bash
# Reset and seed local database
pnpm db:reset  # Applies migrations + runs seed.sql
```

#### 5. GPX File Upload Testing (Optional)

For testing with real activity stream data, create synthetic GPX files with fast paces.

```typescript
// scripts/generate-test-gpx.ts

/**
 * Generates a GPX file with a specified pace for testing.
 * The GPX can be uploaded to a test Strava account.
 *
 * Usage:
 *   pnpm tsx scripts/generate-test-gpx.ts --distance 5000 --pace 3.9 --output test-5k.gpx
 */

function generateGPX(distanceMeters: number, paceMinPerKm: number): string {
  const totalSeconds = (distanceMeters / 1000) * paceMinPerKm * 60;
  const points: string[] = [];

  // Brisbane starting point
  const startLat = -27.4698;
  const startLon = 153.0251;
  const startTime = new Date('2026-01-15T07:00:00Z');

  // Generate points every 10 meters
  for (let d = 0; d <= distanceMeters; d += 10) {
    const fraction = d / distanceMeters;
    const elapsed = fraction * totalSeconds;
    const time = new Date(startTime.getTime() + elapsed * 1000);

    // Simple linear path (east-west)
    const lat = startLat;
    const lon = startLon + d / 111000; // ~111km per degree longitude

    points.push(`
      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}">
        <time>${time.toISOString()}</time>
      </trkpt>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="S40G Test Generator">
  <trk>
    <name>Test Run - ${distanceMeters / 1000}km @ ${paceMinPerKm}:00/km</name>
    <type>running</type>
    <trkseg>${points.join('')}
    </trkseg>
  </trk>
</gpx>`;
}

// Generate a sub-40 10km GPX
const gpx = generateGPX(10000, 3.9);
await Bun.write('test-10k-fast.gpx', gpx);
console.log('Generated test-10k-fast.gpx');
```

#### Testing Checklist

| Test Type                    | What It Tests            | Needs Strava? | Needs DB?    |
| ---------------------------- | ------------------------ | ------------- | ------------ |
| Unit: best-effort algorithm  | Sliding window logic     | No            | No           |
| Unit: milestone calculations | Achievement detection    | No            | No           |
| Unit: token refresh logic    | OAuth token handling     | No (mocked)   | No           |
| Integration: webhook handler | Queue insertion          | No (mocked)   | Yes (local)  |
| Integration: queue processor | Full processing flow     | No (mocked)   | Yes (local)  |
| E2E: feed display            | UI rendering             | No            | Yes (seeded) |
| E2E: leaderboard             | Ranking display          | No            | Yes (seeded) |
| Manual: OAuth flow           | Real Strava login        | Yes           | Yes          |
| Manual: webhook delivery     | Real activity processing | Yes           | Yes          |

**Recommendation**: Use unit tests with fixtures for 90% of Strava logic testing. Only use real Strava API for final manual integration testing before deployment.

---

## Code Quality & Linting

### ESLint Configuration

```javascript
// eslint.config.js

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      '@next/next': nextPlugin,
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',

      // React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Next.js
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-img-element': 'error',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
  prettierConfig
);
```

### Prettier Configuration

```json
// .prettierrc

{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### TypeScript Configuration

```json
// tsconfig.json

{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    },
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Git Hooks (Husky + lint-staged)

```json
// package.json

{
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "prepare": "husky install",
    "lint": "eslint . --fix",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:diff": "supabase db diff",
    "db:push": "supabase db push",
    "db:types": "supabase gen types typescript --local > src/lib/database.types.ts"
  },
  "devDependencies": {
    "supabase": "^2.72.8"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

```bash
# .husky/pre-commit

#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
```

```bash
# .husky/pre-push

#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm typecheck
pnpm test
```

### Commit Message Convention

Using Conventional Commits:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

```bash
# .husky/commit-msg

#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit $1
```

```javascript
// commitlint.config.js

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', ['api', 'ui', 'db', 'auth', 'strava', 'pwa', 'test', 'deps']],
  },
};
```

---

## Deployment

### Vercel Configuration

```json
// vercel.json

{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["syd1"],
  "crons": [
    {
      "path": "/api/cron/process-queue",
      "schedule": "0 15 * * *"
    }
  ]
}
```

**Note:** The primary webhook processing is event-driven via a Supabase database trigger (see below). The daily cron job serves as a fallback safety net.

### Supabase Event-Driven Processing

Webhook processing is triggered immediately when events arrive, using a PostgreSQL trigger with pg_net:

```sql
-- Trigger fires on INSERT to webhook_queue
-- Uses pg_net to async call the Vercel endpoint
CREATE TRIGGER on_webhook_queue_insert
  AFTER INSERT ON webhook_queue
  FOR EACH ROW
  EXECUTE FUNCTION trigger_queue_processor();
```

**Required Supabase setup:**

1. Enable `pg_net` extension (Database → Extensions)
2. Store secrets in Vault:
   ```sql
   SELECT vault.create_secret('your-cron-secret', 'cron_secret', '...');
   SELECT vault.create_secret('https://your-app.vercel.app', 'vercel_app_url', '...');
   ```

This approach:

- Processes webhooks within seconds (not minutes)
- Works within Vercel's free tier (daily cron limit)
- Provides a fallback if the trigger fails

### GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml

name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Database Migrations

```bash
# Using Supabase CLI

# Create a new migration
supabase migration new create_members_table

# Apply migrations locally
supabase db reset

# Push migrations to production
supabase db push
```

---

## Monitoring & Observability

### Error Tracking

Using Vercel's built-in error tracking, or optionally Sentry:

```typescript
// src/lib/sentry.ts (optional)

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
});
```

### Logging

```typescript
// src/lib/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  if (process.env.NODE_ENV === 'production') {
    // JSON format for log aggregation
    console[level](JSON.stringify(entry));
  } else {
    // Pretty print for development
    console[level](`[${level.toUpperCase()}] ${message}`, context ?? '');
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
};
```

### Health Check Endpoint

```typescript
// src/app/api/health/route.ts

import { supabase } from '@/lib/supabase';

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
    },
  };

  try {
    // Check database connection
    const { error } = await supabase.from('members').select('id').limit(1);
    checks.checks.database = error ? 'unhealthy' : 'healthy';
  } catch {
    checks.checks.database = 'unhealthy';
  }

  const isHealthy = Object.values(checks.checks).every((c) => c === 'healthy');
  checks.status = isHealthy ? 'healthy' : 'unhealthy';

  return Response.json(checks, { status: isHealthy ? 200 : 503 });
}
```

### Analytics

Using Vercel Analytics (built-in):

```typescript
// src/app/layout.tsx

import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## Appendix

### Project Structure

```
s40g/
├── src/                        # Application source code
│   ├── app/                    # Next.js App Router
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── strava/
│   │   │   │       ├── route.ts
│   │   │   │       └── callback/route.ts
│   │   │   ├── cron/
│   │   │   │   └── process-queue/route.ts
│   │   │   ├── feed/route.ts
│   │   │   ├── leaderboard/route.ts
│   │   │   ├── profile/
│   │   │   │   ├── route.ts
│   │   │   │   └── recent-activity/route.ts
│   │   │   ├── reactions/route.ts
│   │   │   ├── webhooks/strava/route.ts
│   │   │   └── health/route.ts
│   │   ├── (app)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── leaderboard/page.tsx
│   │   │   └── profile/page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/             # React components
│   │   ├── ui/
│   │   ├── feed/
│   │   ├── leaderboard/
│   │   └── profile/
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-feed-subscription.ts
│   │   └── use-install-prompt.ts
│   ├── lib/                    # Utilities and business logic
│   │   ├── database.types.ts   # Auto-generated from Supabase CLI
│   │   ├── supabase.ts
│   │   ├── auth.ts
│   │   ├── api-auth.ts
│   │   ├── strava.ts
│   │   ├── best-effort.ts
│   │   ├── milestones.ts
│   │   ├── timezone.ts         # Brisbane timezone helpers
│   │   ├── process-activity.ts
│   │   ├── queue-processor.ts
│   │   └── logger.ts
│   └── __tests__/              # Unit and integration tests
│       ├── fixtures/           # Test data fixtures
│       │   └── strava-streams.ts
│       ├── mocks/              # MSW mock handlers
│       │   ├── handlers.ts
│       │   └── server.ts
│       ├── lib/
│       │   ├── best-effort.test.ts
│       │   ├── timezone.test.ts
│       │   └── calculate-achievements.test.ts
│       └── api/
│           ├── feed.test.ts
│           └── webhooks.test.ts
├── supabase/                   # Supabase CLI folder
│   ├── config.toml             # Local Supabase configuration
│   ├── migrations/             # SQL migration files
│   │   ├── 20260101000000_initial_schema.sql
│   │   └── ...
│   └── seed.sql                # Seed data for local development
├── scripts/                    # Development utility scripts
│   ├── simulate-webhook.ts     # Test webhook events locally
│   └── generate-test-gpx.ts    # Generate GPX files for testing
├── e2e/                        # Playwright E2E tests
├── public/                     # Static assets
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
├── .github/workflows/
├── .husky/
├── .env.local                  # Local environment variables (git-ignored)
├── .env.example                # Example env file (committed)
├── eslint.config.mjs
├── vitest.config.ts
├── vitest.setup.ts
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

### Development Commands

```bash
# Install dependencies
pnpm install

# Start local Supabase (first time downloads Docker images)
pnpm db:start

# Run development server
pnpm dev

# Run tests
pnpm test              # Unit + integration
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage
pnpm test:e2e          # E2E tests

# Code quality
pnpm lint              # ESLint
pnpm format            # Prettier
pnpm typecheck         # TypeScript

# Database (Supabase CLI)
pnpm db:start          # Start local Supabase stack
pnpm db:stop           # Stop local Supabase stack
pnpm db:reset          # Reset DB and apply migrations
pnpm db:diff -f <name> # Generate migration from changes
pnpm db:push           # Push migrations to remote
pnpm db:types          # Generate TypeScript types

# Build
pnpm build             # Production build
pnpm start             # Start production server
```
