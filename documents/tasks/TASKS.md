# S40G Implementation Tasks

## Phase 1: Project Setup

### 1.1 Initialize Next.js Project

- [x] **Create Next.js 16.x project with TypeScript**
  - Use `create-next-app` with App Router and Turbopack
  - Configure TypeScript 5.9.x in strict mode
  - Set up path aliases (`@/*`)

### 1.2 Configure Package Manager

- [x] **Set up pnpm workspace**
  - Create `.npmrc` with pnpm configuration
  - Add `packageManager` field to `package.json`

### 1.3 Configure Code Quality Tools

- [x] **Set up ESLint 9.x with flat config**
  - Install ESLint and TypeScript ESLint plugins
  - Configure React and Next.js rules
  - Add lint script to package.json

- [x] **Set up Prettier**
  - Install Prettier and Tailwind CSS plugin
  - Create `.prettierrc` configuration
  - Add format script to package.json

- [x] **Set up Husky and lint-staged**
  - Install Husky and configure git hooks
  - Add pre-commit hook for linting
  - Add pre-push hook for type checking and tests

- [x] **Set up commitlint**
  - Install commitlint with conventional config
  - Add commit-msg hook for message validation

### 1.4 Configure Tailwind CSS

- [x] **Set up Tailwind CSS 4.x**
  - Install Tailwind and configure for Next.js
  - Create base styles in `globals.css`
  - Configure mobile-first breakpoints

### 1.5 Environment Configuration

- [x] **Create environment file templates**
  - Create `.env.example` with all required variables
  - Add `.env.local` to `.gitignore`
  - Document environment variables in README

---

## Phase 2: Database & Infrastructure

### 2.1 Supabase Setup

- [x] **Initialize Supabase CLI**
  - Run `pnpm supabase init` to create supabase folder
  - Configure `supabase/config.toml` for local development

- [x] **Add database scripts to package.json**
  - Add db:start, db:stop, db:reset scripts
  - Add db:diff, db:push, db:types scripts

### 2.2 Database Schema

- [x] **Create initial migration for core tables**
  - Create `members` table with Strava OAuth fields
  - Create `achievements` table with milestone tracking
  - Create `reactions` table for emoji reactions
  - Create `webhook_queue` table for async processing
  - Create `processed_activities` table for last synced run

- [x] **Create indexes and constraints**
  - Add performance indexes on frequently queried columns
  - Add unique constraints for business rules
  - Add foreign key relationships

- [x] **Set up Row Level Security (RLS)**
  - Enable RLS on all tables
  - Create policies for read access
  - Create policies for write access

- [x] **Create updated_at trigger**
  - Create trigger function for automatic timestamp updates
  - Apply trigger to members table

### 2.3 Type Generation

- [x] **Generate TypeScript types from schema**
  - Run db:types to generate `lib/database.types.ts`
  - Verify types are correctly generated

### 2.4 Supabase Client

- [x] **Create Supabase client utilities**
  - Create `lib/supabase.ts` for browser client
  - Create server-side client with service role key
  - Add proper TypeScript typing

### 2.5 Database Seeding

- [x] **Create seed data for development**
  - Add test members to `supabase/seed.sql`
  - Add sample achievements for leaderboard testing
  - Add sample reactions for UI testing

---

## Phase 3: Strava Integration

### 3.1 OAuth Implementation

- [x] **Create Strava OAuth initiation endpoint**
  - Create `app/api/auth/strava/route.ts`
  - Build authorization URL with required scopes
  - Handle redirect to Strava

- [x] **Create OAuth callback endpoint**
  - Create `app/api/auth/strava/callback/route.ts`
  - Exchange authorization code for tokens
  - Create or update member record
  - Create session and redirect to app

- [x] **Create logout endpoint**
  - Create `app/api/auth/logout/route.ts`
  - Clear session cookie
  - Redirect to home page

### 3.2 Session Management

- [x] **Implement JWT session handling**
  - Create `lib/auth.ts` with session utilities
  - Implement createSession, getSession, clearSession
  - Use HTTP-only cookies for security

- [x] **Create API route protection middleware**
  - Create `lib/api-auth.ts` with withAuth wrapper
  - Return 401 for unauthenticated requests

### 3.3 Token Management

- [x] **Implement Strava token refresh**
  - Create `lib/strava.ts` with token refresh logic
  - Check token expiration with buffer
  - Update tokens in database after refresh

### 3.4 Webhook Setup

- [x] **Create webhook verification endpoint**
  - Handle GET requests for Strava subscription verification
  - Validate verify token from environment
  - Return hub.challenge for successful verification

- [x] **Create webhook event handler**
  - Handle POST requests for activity events
  - Filter for activity create events
  - Queue events for async processing
  - Respond within 2 seconds

### 3.5 Queue Processing

- [x] **Create cron job for queue processing**
  - Create `app/api/cron/process-queue/route.ts`
  - Protect with CRON_SECRET header
  - Fetch pending queue items
  - Process each item with retry logic

- [x] **Implement activity processing**
  - Fetch activity details from Strava API
  - Fetch activity streams (time, distance)
  - Filter for run activities
  - Check activity date against join date

### 3.6 Achievement Calculation

- [x] **Create milestone configuration**
  - Create `lib/milestones.ts` with distance/time targets
  - Define all 5 milestones (1km, 2km, 5km, 7.5km, 10km)

- [x] **Create timezone utilities**
  - Create `lib/timezone.ts` for Brisbane time
  - Implement getSeasonForDate function
  - Implement getCurrentSeason function

- [x] **Implement sliding window algorithm**
  - Create `lib/best-effort.ts`
  - Find fastest segment for target distance
  - Return best effort with actual distance and time

- [x] **Create activity processing logic**
  - Create `lib/process-activity.ts`
  - Check each milestone against best effort
  - Insert new achievements to database
  - Record processed activity for "last synced run"

---

## Phase 4: Core Features

### 4.1 Activity Feed

- [x] **Create feed API endpoint**
  - Create `app/api/feed/route.ts`
  - Return paginated achievements with member data
  - Include reactions for each achievement

- [x] **Create feed page**
  - Create `app/(app)/feed/page.tsx` as feed page
  - Implement infinite scroll or pagination
  - Display achievement cards with member info

- [x] **Create achievement card component**
  - Show member photo, name, milestone
  - Display achieved time and timestamp
  - Include reaction buttons

### 4.2 Leaderboard

- [x] **Create leaderboard API endpoint**
  - Create `app/api/leaderboard/route.ts`
  - Aggregate achievements by member for current season
  - Sort by total milestones unlocked

- [x] **Create leaderboard page**
  - Create `app/(app)/leaderboard/page.tsx`
  - Display ranked list of members
  - Show milestone progress icons
  - Highlight current user

### 4.3 Profile

- [x] **Create profile API endpoint**
  - Create `app/api/profile/route.ts`
  - Return current user's milestone status
  - Include achievement details

- [x] **Create recent activity API endpoint**
  - Create `app/api/profile/recent-activity/route.ts`
  - Return most recent synced run
  - Include pace and milestones unlocked

- [x] **Create profile page**
  - Create `app/(app)/profile/page.tsx`
  - Display milestone grid (locked/unlocked)
  - Show last synced run card

### 4.4 Navigation

- [x] **Create app layout with navigation**
  - Create `app/(app)/layout.tsx`
  - Add bottom navigation bar
  - Include Feed, Leaderboard, Profile links

- [x] **Create login page**
  - Create `app/page.tsx` for unauthenticated users
  - Add "Sign in with Strava" button
  - Show app branding and description

---

## Phase 5: Social Features

### 5.1 Reactions

- [x] **Create reactions API endpoints**
  - Create POST `app/api/reactions/route.ts` for adding
  - Create DELETE `app/api/reactions/[id]/route.ts` for removing
  - Validate emoji against allowed set

- [x] **Create reaction component**
  - Display reaction buttons (four emojis)
  - Show reaction counts
  - Toggle own reaction on click

### 5.2 Real-time Updates

- [x] **Set up Supabase Realtime**
  - Enable realtime for achievements table
  - Enable realtime for reactions table

- [x] **Create feed subscription hook**
  - Create `hooks/use-feed-subscription.ts`
  - Subscribe to new achievements
  - Update feed in real-time

---

## Phase 6: PWA & Polish

### 6.1 PWA Setup

- [x] **Create web app manifest**
  - Create `public/manifest.json`
  - Configure app name, icons, colors
  - Set display mode to standalone

- [x] **Create service worker**
  - Create `public/sw.js`
  - Cache static assets
  - Implement network-first strategy

- [x] **Create offline page**
  - Create `app/offline/page.tsx`
  - Display friendly offline message

- [x] **Register service worker**
  - Add registration in app layout
  - Handle updates gracefully

### 6.2 Install Prompt

- [x] **Create install prompt hook**
  - Create `hooks/use-install-prompt.ts`
  - Capture beforeinstallprompt event
  - Provide install function

- [x] **Add install prompt UI**
  - Show prompt on first visit (after onboarding)
  - Include "Add to Home Screen" messaging

### 6.3 UI Polish

- [x] **Add loading states**
  - Create skeleton components for feed
  - Add loading spinners for actions

- [x] **Add error handling UI**
  - Create error boundary components
  - Display user-friendly error messages

- [x] **Add celebration animations**
  - Add confetti or animation for milestone unlocks
  - Make achievement cards visually celebratory

---

## Phase 7: Testing

### 7.1 Test Infrastructure

- [x] **Set up Vitest**
  - Install Vitest and configure for Next.js
  - Create `vitest.config.ts`
  - Add test scripts to package.json

- [x] **Set up MSW for API mocking**
  - Install MSW and create handlers
  - Create Strava API mock handlers
  - Set up test server

- [x] **Create test fixtures**
  - Create `__tests__/fixtures/strava-streams.ts`
  - Add sample activity streams for testing
  - Include fast, slow, and variable pace runs

### 7.2 Unit Tests

- [x] **Test sliding window algorithm**
  - Test with various stream lengths
  - Test edge cases (empty, short runs)
  - Test segment finding accuracy

- [x] **Test timezone utilities**
  - Test season calculation for Brisbane
  - Test boundary cases (NYE, NY Day)

- [x] **Test milestone calculations**
  - Test achievement detection
  - Test skipping already achieved milestones

### 7.3 Integration Tests

- [x] **Test API endpoints**
  - Test feed endpoint with pagination
  - Test leaderboard aggregation
  - Test reactions CRUD

- [x] **Test webhook processing**
  - Test queue insertion
  - Test activity processing flow

### 7.4 E2E Tests

- [x] **Set up Playwright**
  - Install Playwright and configure
  - Create `playwright.config.ts`
  - Add e2e script to package.json

- [x] **Create onboarding E2E tests**
  - Test sign in flow redirect
  - Test authenticated user access

- [x] **Create feed E2E tests**
  - Test feed display
  - Test reaction interactions

---

## Phase 8: Deployment

### 8.1 Vercel Configuration

- [ ] **Create Vercel configuration**
  - Create `vercel.json` with cron jobs
  - Configure build and install commands
  - Set region to Sydney (syd1)

- [ ] **Configure environment variables**
  - Add all required env vars in Vercel dashboard
  - Set up production Supabase credentials
  - Configure Strava production credentials

### 8.2 CI/CD

- [ ] **Create GitHub Actions workflow**
  - Create `.github/workflows/ci.yml`
  - Run lint, typecheck, and tests on PR
  - Upload test coverage to Codecov

### 8.3 Production Setup

- [ ] **Set up production Supabase project**
  - Create Supabase project
  - Link local project to remote
  - Push migrations to production

- [ ] **Register Strava webhook**
  - Create webhook subscription in Strava API
  - Verify webhook is receiving events

- [ ] **Configure security headers**
  - Add security headers in next.config.js
  - Verify HTTPS enforcement

### 8.4 Monitoring

- [ ] **Create health check endpoint**
  - Create `app/api/health/route.ts`
  - Check database connectivity
  - Return health status

- [ ] **Set up Vercel Analytics**
  - Add Analytics component to layout
  - Verify analytics are being collected

---

## Progress Summary

| Phase                        | Tasks  | Completed |
| ---------------------------- | ------ | --------- |
| 1. Project Setup             | 8      | 8         |
| 2. Database & Infrastructure | 9      | 9         |
| 3. Strava Integration        | 14     | 14        |
| 4. Core Features             | 10     | 10        |
| 5. Social Features           | 4      | 4         |
| 6. PWA & Polish              | 9      | 9         |
| 7. Testing                   | 11     | 11        |
| 8. Deployment                | 8      | 0         |
| **Total**                    | **73** | **65**    |
