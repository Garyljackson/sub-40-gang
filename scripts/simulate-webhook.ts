#!/usr/bin/env tsx
/**
 * Simulate Strava Webhook
 *
 * Manually queue Strava activities for processing when webhooks are missed.
 *
 * Usage:
 *   # List recent activities for an athlete (local database)
 *   TOKEN_ENCRYPTION_KEY="<key>" pnpm tsx scripts/simulate-webhook.ts --athlete 35797774 --list
 *
 *   # List recent activities (remote database - use production key from Vercel)
 *   TOKEN_ENCRYPTION_KEY="<production-key>" pnpm tsx scripts/simulate-webhook.ts --athlete 35797774 --list --remote
 *
 *   # Queue a specific activity for processing
 *   TOKEN_ENCRYPTION_KEY="<key>" pnpm tsx scripts/simulate-webhook.ts --activity 12345678 --athlete 35797774
 *   TOKEN_ENCRYPTION_KEY="<production-key>" pnpm tsx scripts/simulate-webhook.ts --activity 12345678 --athlete 35797774 --remote
 */

import { execSync } from 'child_process';
import pg from 'pg';
import { decryptToken } from '../src/lib/encryption';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

interface Args {
  athlete?: string;
  activity?: string;
  list: boolean;
  remote: boolean;
  help: boolean;
}

interface Member {
  id: string;
  name: string;
  strava_athlete_id: string;
  strava_access_token: string;
  strava_refresh_token: string;
  token_expires_at: string;
}

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
}

function parseArgs(): Args {
  const args: Args = {
    list: false,
    remote: false,
    help: false,
  };

  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--athlete' && argv[i + 1]) {
      args.athlete = argv[++i];
    } else if (arg === '--activity' && argv[i + 1]) {
      args.activity = argv[++i];
    } else if (arg === '--list') {
      args.list = true;
    } else if (arg === '--remote') {
      args.remote = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }

  return args;
}

function printUsage(): void {
  console.log(`
Usage: TOKEN_ENCRYPTION_KEY="<key>" pnpm tsx scripts/simulate-webhook.ts [options]

Options:
  --athlete <id>    Strava athlete ID (required)
  --activity <id>   Strava activity ID to queue
  --list            List recent activities for the athlete
  --remote          Use remote Supabase (linked project) instead of local
  --help, -h        Show this help message

Examples:
  # List recent activities (local database)
  TOKEN_ENCRYPTION_KEY="<local-key>" pnpm tsx scripts/simulate-webhook.ts --athlete 35797774 --list

  # List recent activities (remote database - use production key from Vercel)
  TOKEN_ENCRYPTION_KEY="<production-key>" pnpm tsx scripts/simulate-webhook.ts --athlete 35797774 --list --remote

  # Queue an activity for processing
  TOKEN_ENCRYPTION_KEY="<production-key>" pnpm tsx scripts/simulate-webhook.ts --activity 12345678 --athlete 35797774 --remote
`);
}

interface DbCredentials {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

function getRemoteCredentials(): DbCredentials {
  console.log('Getting remote database credentials from Supabase CLI...');

  const output = execSync('pnpm supabase db dump --linked --data-only --dry-run 2>&1', {
    encoding: 'utf-8',
  });

  const hostMatch = output.match(/export PGHOST="([^"]+)"/);
  const portMatch = output.match(/export PGPORT="([^"]+)"/);
  const userMatch = output.match(/export PGUSER="([^"]+)"/);
  const passwordMatch = output.match(/export PGPASSWORD="([^"]+)"/);
  const databaseMatch = output.match(/export PGDATABASE="([^"]+)"/);

  if (
    !hostMatch?.[1] ||
    !portMatch?.[1] ||
    !userMatch?.[1] ||
    !passwordMatch?.[1] ||
    !databaseMatch?.[1]
  ) {
    throw new Error('Failed to parse Supabase CLI credentials. Make sure you are logged in.');
  }

  return {
    host: hostMatch[1],
    port: parseInt(portMatch[1]),
    user: userMatch[1],
    password: passwordMatch[1],
    database: databaseMatch[1],
  };
}

function getLocalCredentials(): DbCredentials {
  return {
    host: '127.0.0.1',
    port: 54322,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
  };
}

async function createDbClient(remote: boolean): Promise<pg.Client> {
  const creds = remote ? getRemoteCredentials() : getLocalCredentials();

  const client = new pg.Client({
    host: creds.host,
    port: creds.port,
    user: creds.user,
    password: creds.password,
    database: creds.database,
    ssl: remote ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  // For remote, need to SET ROLE postgres to access tables
  if (remote) {
    await client.query('SET ROLE postgres');
  }

  return client;
}

async function getMemberByAthleteId(client: pg.Client, athleteId: string): Promise<Member | null> {
  const result = await client.query<Member>(
    `SELECT id, name, strava_athlete_id, strava_access_token, strava_refresh_token, token_expires_at
     FROM members
     WHERE strava_athlete_id = $1`,
    [athleteId]
  );

  return result.rows[0] || null;
}

async function listRecentActivities(accessToken: string): Promise<StravaActivity[]> {
  const response = await fetch(`${STRAVA_API_BASE}/athlete/activities?per_page=10`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Strava API error (${response.status}): ${error}`);
  }

  return response.json();
}

async function insertWebhookQueue(
  client: pg.Client,
  activityId: string,
  athleteId: string
): Promise<void> {
  const result = await client.query(
    `INSERT INTO webhook_queue (strava_activity_id, strava_athlete_id, event_type, status, attempts, max_attempts)
     VALUES ($1, $2, 'create', 'pending', 0, 3)
     ON CONFLICT (strava_activity_id) DO UPDATE SET
       status = 'pending',
       attempts = 0,
       error_message = NULL,
       processed_at = NULL
     RETURNING id, created_at`,
    [activityId, athleteId]
  );

  const row = result.rows[0];
  console.log(`Queued activity ${activityId} with queue ID: ${row.id}`);
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`;
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printUsage();
    process.exit(0);
  }

  if (!args.athlete) {
    console.error('Error: --athlete is required');
    printUsage();
    process.exit(1);
  }

  if (!args.list && !args.activity) {
    console.error('Error: Either --list or --activity is required');
    printUsage();
    process.exit(1);
  }

  // Require explicit TOKEN_ENCRYPTION_KEY for decrypting stored tokens
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    console.error('Error: TOKEN_ENCRYPTION_KEY environment variable is required');
    console.error('');
    console.error('Usage:');
    console.error(
      '  TOKEN_ENCRYPTION_KEY="<key>" pnpm tsx scripts/simulate-webhook.ts --athlete <id> --list'
    );
    console.error('');
    console.error('For remote database, use the PRODUCTION key from Vercel:');
    console.error(
      '  TOKEN_ENCRYPTION_KEY="<production-key>" pnpm tsx scripts/simulate-webhook.ts --athlete <id> --list --remote'
    );
    process.exit(1);
  }

  const dbLabel = args.remote ? 'remote' : 'local';
  console.log(`Connecting to ${dbLabel} database...`);

  const client = await createDbClient(args.remote);

  try {
    // Look up member
    const member = await getMemberByAthleteId(client, args.athlete);
    if (!member) {
      console.error(`Error: No member found with Strava athlete ID: ${args.athlete}`);
      process.exit(1);
    }

    console.log(`Found member: ${member.name} (${member.id})`);

    if (args.list) {
      // List recent activities
      console.log(`\nFetching recent activities from Strava...`);
      const accessToken = decryptToken(member.strava_access_token);
      const activities = await listRecentActivities(accessToken);

      if (activities.length === 0) {
        console.log('No activities found.');
      } else {
        console.log(`\nRecent activities for ${member.name}:\n`);
        console.log('ID           | Date                | Type | Distance   | Time    | Name');
        console.log('-------------|---------------------|------|------------|---------|-----');

        for (const activity of activities) {
          const date = new Date(activity.start_date_local)
            .toISOString()
            .slice(0, 16)
            .replace('T', ' ');
          const type = activity.type.padEnd(4).slice(0, 4);
          const distance = formatDistance(activity.distance).padStart(10);
          const time = formatDuration(activity.moving_time).padStart(7);
          console.log(
            `${activity.id} | ${date} | ${type} | ${distance} | ${time} | ${activity.name}`
          );
        }

        console.log('\nTo queue an activity:');
        console.log(
          `  pnpm tsx scripts/simulate-webhook.ts --activity <ID> --athlete ${args.athlete}${args.remote ? ' --remote' : ''}`
        );
      }
    }

    if (args.activity) {
      // Queue the activity
      console.log(`\nQueueing activity ${args.activity} for processing...`);
      await insertWebhookQueue(client, args.activity, args.athlete);
      console.log('Done! The activity will be processed by the next cron run (every minute).');
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
