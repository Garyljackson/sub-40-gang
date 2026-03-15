#!/usr/bin/env tsx
/**
 * Backfill Elapsed Time
 *
 * Backfills elapsed_time_seconds for existing processed_activities rows that
 * were created before this column was added. Fetches each activity from the
 * Strava API and updates the record.
 *
 * Usage:
 *   # Local database
 *   TOKEN_ENCRYPTION_KEY="<key>" pnpm tsx scripts/backfill-elapsed-time.ts
 *
 *   # Production database
 *   TOKEN_ENCRYPTION_KEY="<production-key>" pnpm tsx scripts/backfill-elapsed-time.ts --remote
 */

import { execSync } from 'child_process';
import pg from 'pg';
import { decryptToken } from '../src/lib/encryption';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

interface Args {
  remote: boolean;
}

interface Row {
  strava_activity_id: string;
  member_id: string;
  strava_refresh_token: string;
  strava_access_token: string;
  token_expires_at: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  return { remote: argv.includes('--remote') };
}

interface DbCredentials {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

function getRemoteCredentials(): DbCredentials {
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
    ...creds,
    ssl: remote ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  if (remote) await client.query('SET ROLE postgres');
  return client;
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    throw new Error('STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET must be set');
  }

  const res = await fetch('https://www.strava.com/api/v3/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function fetchElapsedTime(activityId: string, accessToken: string): Promise<number> {
  const res = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Strava API error (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { elapsed_time: number };
  return data.elapsed_time;
}

async function main(): Promise<void> {
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    console.error('Error: TOKEN_ENCRYPTION_KEY environment variable is required');
    process.exit(1);
  }

  const args = parseArgs();
  const dbLabel = args.remote ? 'remote (production)' : 'local';
  console.log(`Connecting to ${dbLabel} database...`);

  const client = await createDbClient(args.remote);

  try {
    // Fetch all processed_activities rows missing elapsed_time_seconds, joined with member tokens
    const { rows } = await client.query<Row>(`
      SELECT
        pa.strava_activity_id,
        pa.member_id,
        m.strava_access_token,
        m.strava_refresh_token,
        m.token_expires_at
      FROM processed_activities pa
      JOIN members m ON m.id = pa.member_id
      WHERE pa.elapsed_time_seconds IS NULL
      ORDER BY pa.activity_date DESC
    `);

    if (rows.length === 0) {
      console.log('Nothing to backfill — all rows already have elapsed_time_seconds.');
      return;
    }

    console.log(`Found ${rows.length} row(s) to backfill.\n`);

    // Cache refreshed tokens per member to avoid refreshing multiple times
    const tokenCache = new Map<string, string>();
    let updated = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        let accessToken = tokenCache.get(row.member_id);

        if (!accessToken) {
          const tokenExpired = new Date(row.token_expires_at) <= new Date();
          if (tokenExpired) {
            const refreshToken = decryptToken(row.strava_refresh_token);
            accessToken = await refreshAccessToken(refreshToken);
          } else {
            accessToken = decryptToken(row.strava_access_token);
          }
          tokenCache.set(row.member_id, accessToken);
        }

        const elapsedTime = await fetchElapsedTime(row.strava_activity_id, accessToken);

        await client.query(
          `UPDATE processed_activities SET elapsed_time_seconds = $1 WHERE strava_activity_id = $2`,
          [elapsedTime, row.strava_activity_id]
        );

        console.log(`  ✓ activity ${row.strava_activity_id} → elapsed_time=${elapsedTime}s`);
        updated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ✗ activity ${row.strava_activity_id} → ${msg}`);
        failed++;
      }
    }

    console.log(`\nDone. Updated: ${updated}, Failed: ${failed}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
