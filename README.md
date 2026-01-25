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
