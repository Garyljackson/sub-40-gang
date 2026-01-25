/**
 * Test fixtures for member data
 * Matches the seed.sql test data for consistency
 */

export interface TestMember {
  id: string;
  strava_athlete_id: string;
  name: string;
  profile_photo_url: string | null;
  strava_access_token: string;
  strava_refresh_token: string;
  token_expires_at: Date;
  joined_at: Date;
}

/**
 * Alice - Has all milestones achieved, joined Jan 1
 */
export const alice: TestMember = {
  id: '11111111-1111-1111-1111-111111111111',
  strava_athlete_id: '10001',
  name: 'Alice Runner',
  profile_photo_url: null,
  strava_access_token: 'fake-token-alice',
  strava_refresh_token: 'fake-refresh-alice',
  token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
  joined_at: new Date('2026-01-01'),
};

/**
 * Bob - Has partial progress (1km, 2km), joined Jan 5
 */
export const bob: TestMember = {
  id: '22222222-2222-2222-2222-222222222222',
  strava_athlete_id: '10002',
  name: 'Bob Jogger',
  profile_photo_url: null,
  strava_access_token: 'fake-token-bob',
  strava_refresh_token: 'fake-refresh-bob',
  token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
  joined_at: new Date('2026-01-05'),
};

/**
 * Charlie - Just started (1km only), joined Jan 10
 */
export const charlie: TestMember = {
  id: '33333333-3333-3333-3333-333333333333',
  strava_athlete_id: '10003',
  name: 'Charlie Sprinter',
  profile_photo_url: null,
  strava_access_token: 'fake-token-charlie',
  strava_refresh_token: 'fake-refresh-charlie',
  token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
  joined_at: new Date('2026-01-10'),
};

/**
 * A member with an expired token - for testing token refresh
 */
export const expiredTokenMember: TestMember = {
  id: '44444444-4444-4444-4444-444444444444',
  strava_athlete_id: '10004',
  name: 'Dave Expired',
  profile_photo_url: null,
  strava_access_token: 'expired-token',
  strava_refresh_token: 'valid-refresh',
  token_expires_at: new Date(Date.now() - 60 * 60 * 1000), // Expired 1 hour ago
  joined_at: new Date('2026-01-01'),
};

/**
 * All test members as an array
 */
export const testMembers = [alice, bob, charlie];

/**
 * Map of members by strava_athlete_id for quick lookup
 */
export const membersByAthleteId: Record<string, TestMember> = {
  '10001': alice,
  '10002': bob,
  '10003': charlie,
  '10004': expiredTokenMember,
};

/**
 * Map of members by id for quick lookup
 */
export const membersById: Record<string, TestMember> = {
  [alice.id]: alice,
  [bob.id]: bob,
  [charlie.id]: charlie,
  [expiredTokenMember.id]: expiredTokenMember,
};

/**
 * Session data for authenticated API tests
 */
export interface TestSession {
  memberId: string;
  stravaAthleteId: string;
  name: string;
}

export const aliceSession: TestSession = {
  memberId: alice.id,
  stravaAthleteId: alice.strava_athlete_id,
  name: alice.name,
};

export const bobSession: TestSession = {
  memberId: bob.id,
  stravaAthleteId: bob.strava_athlete_id,
  name: bob.name,
};

export const charlieSession: TestSession = {
  memberId: charlie.id,
  stravaAthleteId: charlie.strava_athlete_id,
  name: charlie.name,
};
