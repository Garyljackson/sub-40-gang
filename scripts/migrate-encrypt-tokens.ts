#!/usr/bin/env tsx
/**
 * Migrate Existing Tokens to Encrypted Format
 *
 * One-time migration to encrypt existing plain-text Strava tokens in the database.
 * Skips tokens that are already encrypted.
 *
 * Usage:
 *   # Encrypt tokens in local database
 *   pnpm tsx scripts/migrate-encrypt-tokens.ts
 *
 *   # Encrypt tokens in remote database
 *   pnpm tsx scripts/migrate-encrypt-tokens.ts --remote
 *
 *   # Dry run (show what would be encrypted without making changes)
 *   pnpm tsx scripts/migrate-encrypt-tokens.ts --dry-run
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { execSync } from 'child_process';
import pg from 'pg';
import { encryptToken, isEncrypted } from '../src/lib/encryption';

interface Args {
  remote: boolean;
  dryRun: boolean;
  help: boolean;
}

interface DbCredentials {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

function parseArgs(): Args {
  const args: Args = {
    remote: false,
    dryRun: false,
    help: false,
  };

  const argv = process.argv.slice(2);
  for (const arg of argv) {
    if (arg === '--remote') {
      args.remote = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }

  return args;
}

function printUsage(): void {
  console.log(`
Usage: pnpm tsx scripts/migrate-encrypt-tokens.ts [options]

Options:
  --remote      Use remote Supabase (linked project) instead of local
  --dry-run     Show what would be encrypted without making changes
  --help, -h    Show this help message

Examples:
  # Encrypt tokens in local database
  pnpm tsx scripts/migrate-encrypt-tokens.ts

  # Encrypt tokens in remote database
  pnpm tsx scripts/migrate-encrypt-tokens.ts --remote

  # Preview changes without modifying data
  pnpm tsx scripts/migrate-encrypt-tokens.ts --dry-run
`);
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

  if (remote) {
    await client.query('SET ROLE postgres');
  }

  return client;
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printUsage();
    process.exit(0);
  }

  // Verify encryption key is available
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    console.error('Error: TOKEN_ENCRYPTION_KEY environment variable is not set');
    console.error(
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
    process.exit(1);
  }

  const dbLabel = args.remote ? 'remote' : 'local';
  const modeLabel = args.dryRun ? ' (DRY RUN)' : '';
  console.log(`Connecting to ${dbLabel} database...${modeLabel}`);

  const client = await createDbClient(args.remote);

  try {
    // Fetch all members with non-null tokens
    const result = await client.query<{
      id: string;
      name: string;
      strava_access_token: string;
      strava_refresh_token: string;
    }>(`
      SELECT id, name, strava_access_token, strava_refresh_token
      FROM members
      WHERE strava_access_token IS NOT NULL
        AND strava_refresh_token IS NOT NULL
    `);

    console.log(`Found ${result.rows.length} members with tokens\n`);

    let encrypted = 0;
    let skipped = 0;

    for (const row of result.rows) {
      // Check if already encrypted
      if (isEncrypted(row.strava_access_token)) {
        console.log(`  [SKIP] ${row.name} (${row.id}) - already encrypted`);
        skipped++;
        continue;
      }

      if (args.dryRun) {
        console.log(`  [WOULD ENCRYPT] ${row.name} (${row.id})`);
        encrypted++;
        continue;
      }

      // Encrypt tokens
      const encryptedAccessToken = encryptToken(row.strava_access_token);
      const encryptedRefreshToken = encryptToken(row.strava_refresh_token);

      // Update database
      await client.query(
        `UPDATE members
         SET strava_access_token = $1,
             strava_refresh_token = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [encryptedAccessToken, encryptedRefreshToken, row.id]
      );

      console.log(`  [ENCRYPTED] ${row.name} (${row.id})`);
      encrypted++;
    }

    console.log(`\nSummary:`);
    console.log(`  Encrypted: ${encrypted}`);
    console.log(`  Skipped (already encrypted): ${skipped}`);

    if (args.dryRun && encrypted > 0) {
      console.log(`\nRun without --dry-run to apply changes.`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
