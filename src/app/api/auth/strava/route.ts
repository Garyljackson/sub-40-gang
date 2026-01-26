import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  buildAuthorizationUrl,
  generateOAuthState,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_MAX_AGE_SECONDS,
} from '@/lib/strava';

export async function GET() {
  // Generate cryptographically random state for CSRF protection
  const state = generateOAuthState();

  // Store state in HTTP-only cookie for validation in callback
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    path: '/',
  });

  const authUrl = buildAuthorizationUrl(state);
  return NextResponse.redirect(authUrl);
}
