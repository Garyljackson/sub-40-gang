#!/usr/bin/env tsx
/**
 * Re-encrypt Tokens with Different Key
 *
 * Decrypts tokens with OLD_KEY and re-encrypts with NEW_KEY.
 * Use this when tokens were encrypted with the wrong key.
 *
 * Usage:
 *   # Re-encrypt tokens in remote database
 *   OLD_KEY="<old-key>" NEW_KEY="<new-key>" pnpm tsx scripts/reencrypt-tokens.ts --remote
 *
 *   # Dry run (show what would be re-encrypted without making changes)
 *   OLD_KEY="<old-key>" NEW_KEY="<new-key>" pnpm tsx scripts/reencrypt-tokens.ts --remote --dry-run
 */

import { execSync } from 'child_process';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import pg from 'pg';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

// Members to skip (already have correct encryption)
const SKIP_ATHLETE_IDS = ['99146547']; // Olivier Huet

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
Usage: OLD_KEY="..." NEW_KEY="..." pnpm tsx scripts/reencrypt-tokens.ts [options]

Environment Variables:
  OLD_KEY           The key tokens were encrypted with (base64, 32 bytes)
  NEW_KEY           The key to re-encrypt tokens with (base64, 32 bytes)

Options:
  --remote          Use remote Supabase (linked project) instead of local
  --dry-run         Show what would be re-encrypted without making changes
  --help, -h        Show this help message

Examples:
  # Re-encrypt tokens in remote database
  OLD_KEY="abc123..." NEW_KEY="xyz789..." pnpm tsx scripts/reencrypt-tokens.ts --remote

  # Preview changes without modifying data
  OLD_KEY="abc123..." NEW_KEY="xyz789..." pnpm tsx scripts/reencrypt-tokens.ts --remote --dry-run
`);
}

function getKeyBuffer(key: string, name: string): Buffer {
  const keyBuffer = Buffer.from(key, 'base64');
  if (keyBuffer.length !== 32) {
    throw new Error(`${name} must be 32 bytes (base64 encoded), got ${keyBuffer.length} bytes`);
  }
  return keyBuffer;
}

function decryptWithKey(ciphertext: string, key: Buffer): string {
  const combined = Buffer.from(ciphertext, 'base64');

  if (combined.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted token: too short');
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

function encryptWithKey(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, encrypted, authTag]);
  return combined.toString('base64');
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

  const oldKey = process.env.OLD_KEY;
  const newKey = process.env.NEW_KEY;

  if (!oldKey) {
    console.error('Error: OLD_KEY environment variable is not set');
    printUsage();
    process.exit(1);
  }

  if (!newKey) {
    console.error('Error: NEW_KEY environment variable is not set');
    printUsage();
    process.exit(1);
  }

  const oldKeyBuffer = getKeyBuffer(oldKey, 'OLD_KEY');
  const newKeyBuffer = getKeyBuffer(newKey, 'NEW_KEY');

  const dbLabel = args.remote ? 'remote' : 'local';
  const modeLabel = args.dryRun ? ' (DRY RUN)' : '';
  console.log(`Connecting to ${dbLabel} database...${modeLabel}`);

  const client = await createDbClient(args.remote);

  try {
    // Fetch all members with non-null tokens
    const result = await client.query<{
      id: string;
      name: string;
      strava_athlete_id: string;
      strava_access_token: string;
      strava_refresh_token: string;
    }>(`
      SELECT id, name, strava_athlete_id, strava_access_token, strava_refresh_token
      FROM members
      WHERE strava_access_token IS NOT NULL
        AND strava_refresh_token IS NOT NULL
    `);

    console.log(`Found ${result.rows.length} members with tokens\n`);

    let reencrypted = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of result.rows) {
      // Skip members that already have correct encryption
      if (SKIP_ATHLETE_IDS.includes(row.strava_athlete_id)) {
        console.log(`  [SKIP] ${row.name} - already using correct key`);
        skipped++;
        continue;
      }

      try {
        // Decrypt with old key
        const accessToken = decryptWithKey(row.strava_access_token, oldKeyBuffer);
        const refreshToken = decryptWithKey(row.strava_refresh_token, oldKeyBuffer);

        if (args.dryRun) {
          console.log(`  [WOULD RE-ENCRYPT] ${row.name} (${row.id})`);
          reencrypted++;
          continue;
        }

        // Re-encrypt with new key
        const newAccessToken = encryptWithKey(accessToken, newKeyBuffer);
        const newRefreshToken = encryptWithKey(refreshToken, newKeyBuffer);

        // Update database
        await client.query(
          `UPDATE members
           SET strava_access_token = $1,
               strava_refresh_token = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [newAccessToken, newRefreshToken, row.id]
        );

        console.log(`  [RE-ENCRYPTED] ${row.name} (${row.id})`);
        reencrypted++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.log(`  [FAILED] ${row.name} - ${message}`);
        failed++;
      }
    }

    console.log(`\nSummary:`);
    console.log(`  Re-encrypted: ${reencrypted}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Failed: ${failed}`);

    if (args.dryRun && reencrypted > 0) {
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
