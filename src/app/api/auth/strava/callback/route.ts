import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCode, OAUTH_STATE_COOKIE_NAME } from '@/lib/strava';
import { createSession } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Handle OAuth errors
  if (error) {
    console.error('Strava OAuth error:', error);
    return NextResponse.redirect(`${appUrl}?error=auth_denied`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}?error=missing_code`);
  }

  // Validate CSRF state parameter
  const cookieStore = await cookies();
  const storedState = cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value;

  // Delete the state cookie immediately (single use)
  cookieStore.delete(OAUTH_STATE_COOKIE_NAME);

  if (!state || !storedState || state !== storedState) {
    console.error('OAuth state mismatch - possible CSRF attack');
    return NextResponse.redirect(`${appUrl}?error=invalid_state`);
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCode(code);

    if (!tokens.athlete) {
      throw new Error('No athlete data returned from Strava');
    }

    const athlete = tokens.athlete;
    const supabase = createServiceClient();

    // Upsert member record (single query using ON CONFLICT)
    // Note: joined_at has a DB default so it's only set on initial insert
    const { data: member, error: upsertError } = await supabase
      .from('members')
      .upsert(
        {
          strava_athlete_id: String(athlete.id),
          name: `${athlete.firstname} ${athlete.lastname}`.trim(),
          profile_photo_url: athlete.profile || athlete.profile_medium || null,
          strava_access_token: tokens.access_token,
          strava_refresh_token: tokens.refresh_token,
          token_expires_at: new Date(tokens.expires_at * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'strava_athlete_id' }
      )
      .select('id')
      .single();

    if (upsertError || !member) {
      throw new Error(`Failed to upsert member: ${upsertError?.message}`);
    }

    const memberId = member.id;

    // Create session
    await createSession({
      memberId,
      stravaAthleteId: String(athlete.id),
      name: `${athlete.firstname} ${athlete.lastname}`.trim(),
    });

    return NextResponse.redirect(appUrl);
  } catch (err) {
    console.error('Strava OAuth callback error:', err);
    return NextResponse.redirect(`${appUrl}?error=auth_failed`);
  }
}
