# Scripts

Utility scripts for managing the S40G application.

## simulate-webhook.ts

Manually queue Strava activities for processing when webhooks are missed (e.g., when a user initially denied Strava permissions).

### Prerequisites

- Supabase CLI installed and logged in (`pnpm supabase login`)
- Project linked to remote Supabase (`pnpm supabase link`)
- `TOKEN_ENCRYPTION_KEY` - the encryption key used to decrypt stored Strava tokens
  - For local database: use your local key from `.env.local`
  - For remote database: use the production key from Vercel environment variables

### Usage

```bash
# List recent activities for an athlete
TOKEN_ENCRYPTION_KEY="<key>" pnpm tsx scripts/simulate-webhook.ts --athlete <strava_athlete_id> --list [--remote]

# Queue a specific activity for processing
TOKEN_ENCRYPTION_KEY="<key>" pnpm tsx scripts/simulate-webhook.ts --activity <strava_activity_id> --athlete <strava_athlete_id> [--remote]
```

### Options

| Option            | Description                                                     |
| ----------------- | --------------------------------------------------------------- |
| `--athlete <id>`  | Strava athlete ID (required) - find this in the `members` table |
| `--activity <id>` | Strava activity ID to queue for processing                      |
| `--list`          | List the athlete's 10 most recent Strava activities             |
| `--remote`        | Use remote Supabase database instead of local                   |
| `--help`          | Show help message                                               |

### Examples

**List a member's recent activities (remote database):**

```bash
TOKEN_ENCRYPTION_KEY="<production-key>" pnpm tsx scripts/simulate-webhook.ts --athlete 35797774 --list --remote
```

Output:

```
ID           | Date                | Type | Distance   | Time    | Name
-------------|---------------------|------|------------|---------|-----
17231168950 | 2026-01-31 06:59 | Run  |    4.98 km |   19:24 | Home Court
17220636509 | 2026-01-30 05:33 | Run  |    8.21 km |   42:56 | Morning Run
...
```

**Queue an activity for processing:**

```bash
TOKEN_ENCRYPTION_KEY="<production-key>" pnpm tsx scripts/simulate-webhook.ts --activity 17231168950 --athlete 35797774 --remote
```

The activity will be added to the `webhook_queue` table with status `pending` and processed by the next cron run (every minute on Vercel).

### How It Works

1. Connects to Supabase (local or remote via `--remote` flag)
2. Looks up the member by their Strava athlete ID
3. For `--list`: Fetches recent activities from Strava API using the member's access token
4. For `--activity`: Inserts into `webhook_queue` table with status `pending`
5. The existing Vercel cron job processes the queue and calculates achievements

### Finding Strava Athlete IDs

Query the members table to find athlete IDs:

```sql
SELECT name, strava_athlete_id FROM members;
```

Or use the Supabase CLI:

```bash
pnpm supabase db dump --linked --data-only | grep -A 20 "COPY public.members"
```
