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

Strava webhooks require a publicly accessible URL. For local development, use a tunnel like ngrok.

For production on Vercel, register the webhook subscription after deployment:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=YOUR_STRAVA_CLIENT_ID \
  -d client_secret=YOUR_STRAVA_CLIENT_SECRET \
  -d callback_url=https://your-domain.vercel.app/api/webhooks/strava \
  -d verify_token=YOUR_STRAVA_VERIFY_TOKEN
```

**Important:**

- Use the same `STRAVA_VERIFY_TOKEN` value you set in Vercel environment variables
- The `callback_url` domain must match your Strava app's "Authorization Callback Domain"
- A successful response returns `{"id": 12345}` (your subscription ID)

To view existing subscriptions:

```bash
curl "https://www.strava.com/api/v3/push_subscriptions?client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
```

To delete a subscription:

```bash
curl -X DELETE "https://www.strava.com/api/v3/push_subscriptions/SUBSCRIPTION_ID?client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
```

## Production Deployment (Vercel)

Follow these steps in order to deploy to production.

### Step 1: Create Production Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a name, set a strong database password, and select a region (e.g., Sydney for Australia)
3. Wait for the project to finish provisioning
4. Go to **Project Settings** → **General** and copy the **Reference ID**
5. Link and push migrations:
   ```bash
   pnpm supabase link --project-ref YOUR_PROJECT_REF
   pnpm db:push
   ```
   If the first push fails with a UUID error, reset and retry:
   ```bash
   pnpm supabase db reset --linked
   ```
6. Get your credentials from **Project Settings** → **API**:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### Step 2: Update Strava App Settings

Go to https://www.strava.com/settings/api and update:

- **Authorization Callback Domain**: `your-domain.vercel.app` (no `https://` prefix)

Note your **Client ID** and **Client Secret** for the next step.

### Step 3: Generate Secrets

Generate random strings for the required secrets:

```bash
echo "STRAVA_VERIFY_TOKEN: $(openssl rand -hex 32)"
echo "JWT_SECRET: $(openssl rand -hex 32)"
echo "CRON_SECRET: $(openssl rand -hex 32)"
```

**Save the `STRAVA_VERIFY_TOKEN` value** - you'll need it again when registering the webhook.

### Step 4: Configure Vercel Environment Variables

In Vercel Dashboard → Your Project → **Settings** → **Environment Variables**, add:

| Variable                        | Value                                                     |
| ------------------------------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | From Supabase (Step 1)                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase (Step 1)                                    |
| `SUPABASE_SERVICE_ROLE_KEY`     | From Supabase (Step 1)                                    |
| `STRAVA_CLIENT_ID`              | From Strava API settings                                  |
| `STRAVA_CLIENT_SECRET`          | From Strava API settings                                  |
| `STRAVA_VERIFY_TOKEN`           | Generated secret (Step 3)                                 |
| `STRAVA_REDIRECT_URI`           | `https://your-domain.vercel.app/api/auth/strava/callback` |
| `JWT_SECRET`                    | Generated secret (Step 3)                                 |
| `CRON_SECRET`                   | Generated secret (Step 3)                                 |
| `NEXT_PUBLIC_APP_URL`           | `https://your-domain.vercel.app`                          |

### Step 5: Configure Supabase for Event-Driven Processing

The app uses a database trigger to process Strava webhooks immediately when they arrive (instead of polling with a cron job).

1. **Enable pg_net extension** in Supabase Dashboard:
   - Go to **Database** → **Extensions**
   - Search for `pg_net` and enable it

2. **Store secrets in Supabase Vault** (SQL Editor):

   ```sql
   -- Store the CRON_SECRET (same value as in Vercel)
   SELECT vault.create_secret(
     'your-cron-secret-value',
     'cron_secret',
     'Bearer token for Vercel cron endpoint'
   );

   -- Store your Vercel production URL
   SELECT vault.create_secret(
     'https://your-domain.vercel.app',
     'vercel_app_url',
     'Vercel production URL'
   );
   ```

3. **Verify secrets are stored**:
   ```sql
   SELECT name, description FROM vault.secrets
   WHERE name IN ('cron_secret', 'vercel_app_url');
   ```

### Step 6: Deploy to Vercel

Push your code to trigger a deployment, or manually deploy from the Vercel dashboard.

Verify the deployment by visiting:

- `https://your-domain.vercel.app` - Should show the login page
- `https://your-domain.vercel.app/api/health` - Should return `{"status":"healthy",...}`

### Step 7: Register Strava Webhook

After deployment is live, register the webhook subscription:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=YOUR_STRAVA_CLIENT_ID \
  -d client_secret=YOUR_STRAVA_CLIENT_SECRET \
  -d callback_url=https://your-domain.vercel.app/api/webhooks/strava \
  -d verify_token=YOUR_STRAVA_VERIFY_TOKEN
```

A successful response returns `{"id": 12345}` (your subscription ID).

**Troubleshooting:**

- If you get a callback verification error, ensure `STRAVA_VERIFY_TOKEN` in Vercel matches the `verify_token` in the curl command
- The callback domain must match your Strava app's "Authorization Callback Domain"

### Webhook Management

View existing subscriptions:

```bash
curl "https://www.strava.com/api/v3/push_subscriptions?client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
```

Delete a subscription:

```bash
curl -X DELETE "https://www.strava.com/api/v3/push_subscriptions/SUBSCRIPTION_ID?client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
```

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
src/__tests__/
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

- **Unit tests**: Pure functions in `src/lib/` - test edge cases thoroughly
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
