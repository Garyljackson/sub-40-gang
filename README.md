# sub-40-gang

S40G (Sub 40 Gang) is a mobile-first web app that tracks and celebrates milestone achievements for a social running group working toward a shared goal: running 10km in under 40 minutes.

## Setup

### Prerequisites

- Node.js 22.x (via nvm recommended)
- pnpm 9.x
- Docker Desktop (for local Supabase)

### Strava API Application

1. Go to https://www.strava.com/settings/api (must be logged into Strava)

2. Fill in the application form:
   - **Application Name**: `S40G` (or any name you prefer)
   - **Category**: Choose "Running" or "Training Analysis"
   - **Website**: `http://localhost:3000`
   - **Authorization Callback Domain**: `localhost`
   - **Upload an Icon**: Any small image

3. After saving, note your **Client ID** and **Client Secret**

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
# Supabase (from local Supabase or Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>

# Strava (from https://www.strava.com/settings/api)
STRAVA_CLIENT_ID=<your_client_id>
STRAVA_CLIENT_SECRET=<your_client_secret>
STRAVA_VERIFY_TOKEN=<generate_random_string>
STRAVA_REDIRECT_URI=http://localhost:3000/api/auth/strava/callback

# App secrets
JWT_SECRET=<generate_random_string>
CRON_SECRET=<generate_random_string>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate random strings for secrets:

```bash
openssl rand -hex 32
```

### Running Locally

```bash
# Install dependencies
pnpm install

# Start local Supabase
pnpm db:start

# Apply migrations and seed data
pnpm db:reset

# Start dev server
pnpm dev
```

### Testing the OAuth Flow

Visit http://localhost:3000/api/auth/strava to initiate Strava authentication.

### Webhooks (Production)

Strava webhooks require a publicly accessible URL. For local development, use a tunnel like ngrok. For production on Vercel, register the webhook subscription via the Strava API after deployment.

## Testing

The project has comprehensive test coverage with unit tests, integration tests, and E2E tests.

### Running Tests

```bash
# Run unit and integration tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

### Test Structure

```
__tests__/
├── fixtures/           # Test data fixtures
│   ├── strava-streams.ts   # Strava activity stream data
│   ├── activities.ts       # Strava activity objects
│   ├── members.ts          # Test member data
│   └── achievements.ts     # Test achievement data
├── mocks/              # MSW mock handlers
│   ├── handlers/
│   │   ├── strava.ts       # Strava API mocks
│   │   └── index.ts
│   ├── server.ts           # MSW server setup
│   └── supabase.ts         # Supabase mock utilities
├── lib/                # Unit tests
│   ├── best-effort.test.ts     # Sliding window algorithm
│   ├── milestones.test.ts      # Milestone calculations
│   └── timezone.test.ts        # Brisbane timezone utilities
├── api/                # Integration tests
│   ├── feed.test.ts
│   ├── leaderboard.test.ts
│   ├── reactions.test.ts
│   ├── webhooks-strava.test.ts
│   └── cron-process-queue.test.ts
└── setup.test.ts       # Test setup verification

e2e/
├── fixtures/
│   └── auth.ts             # Authentication fixtures
├── onboarding.spec.ts      # Login/onboarding tests
└── feed.spec.ts            # Authenticated user tests
```

### E2E Test Requirements

E2E tests require:

1. **Local Supabase** running with seed data:

   ```bash
   pnpm db:start
   pnpm db:reset
   ```

2. **JWT_SECRET** matching the test fixture. The Playwright config automatically sets this when starting a fresh dev server. If you have an existing dev server running with a different secret, either:
   - Stop it and let Playwright start a fresh one
   - Run with `CI=true pnpm test:e2e` to force a fresh server

### Test Coverage

| Category          | Tests   | Coverage            |
| ----------------- | ------- | ------------------- |
| Unit Tests        | 85      | Core business logic |
| Integration Tests | 53      | API endpoints       |
| E2E Tests         | 36      | User flows          |
| **Total**         | **174** |                     |

### Writing Tests

- **Unit tests**: Pure functions in `lib/` - test edge cases thoroughly
- **Integration tests**: API routes - mock Supabase and external APIs with MSW
- **E2E tests**: User journeys - use seeded database for realistic data

Example unit test:

```typescript
import { describe, expect, it } from 'vitest';
import { beatsMilestone } from '@/lib/milestones';

describe('beatsMilestone', () => {
  it('returns true when time equals target exactly', () => {
    expect(beatsMilestone('1km', 240)).toBe(true); // 4:00 = 240s
  });
});
```

Example E2E test:

```typescript
import { test, expect } from './fixtures/auth';

test('authenticated user sees feed', async ({ authenticatedPage: page }) => {
  await page.goto('/feed');
  await expect(page).toHaveURL('/feed');
});
```
