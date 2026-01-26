import { NextResponse } from 'next/server';
import {
  buildAuthorizationUrl,
  generateOAuthState,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_MAX_AGE_SECONDS,
} from '@/lib/strava';

export async function GET() {
  // Generate cryptographically random state for CSRF protection
  const state = generateOAuthState();

  const authUrl = buildAuthorizationUrl(state);
  const response = NextResponse.redirect(authUrl);

  // Store state in HTTP-only cookie for validation in callback
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    path: '/',
  });

  return response;
}
