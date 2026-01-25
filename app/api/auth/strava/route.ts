import { NextResponse } from 'next/server';
import { buildAuthorizationUrl } from '@/lib/strava';

export async function GET() {
  const authUrl = buildAuthorizationUrl();
  return NextResponse.redirect(authUrl);
}
