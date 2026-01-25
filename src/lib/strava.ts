import { createServiceClient } from './supabase-server';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_TOKEN_URL = 'https://www.strava.com/api/v3/oauth/token';
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
  expires_in: number;
  token_type: string;
  athlete?: StravaAthlete;
}

export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string;
  profile_medium: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string; // ISO 8601
  start_date_local: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number;
  total_elevation_gain: number;
  athlete: { id: number };
}

export interface StravaStream {
  type: string;
  data: number[];
  series_type: string;
  original_size: number;
  resolution: string;
}

export interface StravaStreamResponse {
  time: StravaStream;
  distance: StravaStream;
}

export class StravaRateLimitError extends Error {
  constructor(
    message: string,
    public resetTime?: number
  ) {
    super(message);
    this.name = 'StravaRateLimitError';
  }
}

export class StravaApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'StravaApiError';
  }
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCode(code: string): Promise<StravaTokenResponse> {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new StravaApiError(`Failed to exchange code: ${error}`, response.status);
  }

  return response.json();
}

/**
 * Refresh an access token
 */
export async function refreshToken(currentRefreshToken: string): Promise<StravaTokenResponse> {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: currentRefreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new StravaApiError(`Failed to refresh token: ${error}`, response.status);
  }

  return response.json();
}

/**
 * Get a valid access token for a member, refreshing if necessary
 * Updates tokens in database after refresh
 */
export async function getValidToken(memberId: string): Promise<string> {
  const supabase = createServiceClient();

  const { data: member, error } = await supabase
    .from('members')
    .select('strava_access_token, strava_refresh_token, token_expires_at')
    .eq('id', memberId)
    .single();

  if (error || !member) {
    throw new Error(`Member not found: ${memberId}`);
  }

  // Check if user has deauthorized (tokens are null)
  if (!member.strava_access_token || !member.strava_refresh_token || !member.token_expires_at) {
    throw new Error(`Member ${memberId} has deauthorized - no valid tokens`);
  }

  const expiresAt = new Date(member.token_expires_at).getTime();
  const now = Date.now();

  // Token is still valid and not expiring soon
  if (expiresAt > now + TOKEN_REFRESH_BUFFER_MS) {
    return member.strava_access_token;
  }

  // Token needs refresh
  const newTokens = await refreshToken(member.strava_refresh_token);

  // Update tokens in database
  const { error: updateError } = await supabase
    .from('members')
    .update({
      strava_access_token: newTokens.access_token,
      strava_refresh_token: newTokens.refresh_token,
      token_expires_at: new Date(newTokens.expires_at * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (updateError) {
    throw new Error(`Failed to update tokens: ${updateError.message}`);
  }

  return newTokens.access_token;
}

/**
 * Fetch activity details from Strava
 */
export async function fetchActivity(
  activityId: string,
  accessToken: string
): Promise<StravaActivity> {
  const response = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 429) {
    const resetHeader = response.headers.get('X-RateLimit-Reset');
    throw new StravaRateLimitError(
      'Rate limit exceeded',
      resetHeader ? parseInt(resetHeader) : undefined
    );
  }

  if (!response.ok) {
    const error = await response.text();
    throw new StravaApiError(`Failed to fetch activity: ${error}`, response.status);
  }

  return response.json();
}

/**
 * Fetch activity streams (time and distance) from Strava
 */
export async function fetchActivityStreams(
  activityId: string,
  accessToken: string
): Promise<{ time: number[]; distance: number[] }> {
  const response = await fetch(
    `${STRAVA_API_BASE}/activities/${activityId}/streams?keys=time,distance&key_by_type=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (response.status === 429) {
    const resetHeader = response.headers.get('X-RateLimit-Reset');
    throw new StravaRateLimitError(
      'Rate limit exceeded',
      resetHeader ? parseInt(resetHeader) : undefined
    );
  }

  if (!response.ok) {
    const error = await response.text();
    throw new StravaApiError(`Failed to fetch activity streams: ${error}`, response.status);
  }

  const data: StravaStreamResponse = await response.json();

  return {
    time: data.time.data,
    distance: data.distance.data,
  };
}

/**
 * Build the Strava authorization URL
 */
export function buildAuthorizationUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: process.env.STRAVA_REDIRECT_URI!,
    response_type: 'code',
    scope: 'activity:read_all',
  });

  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}
