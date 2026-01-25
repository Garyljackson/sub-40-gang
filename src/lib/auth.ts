import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 's40g_session';
const SESSION_EXPIRY_DAYS = 7;

export interface SessionPayload {
  memberId: string;
  stravaAthleteId: string;
  name: string;
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Create a new session and set the session cookie
 */
export async function createSession(payload: SessionPayload): Promise<void> {
  const secret = getJwtSecret();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

/**
 * Get the current session from the cookie
 * Returns null if no valid session exists
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);

    // Validate required fields
    if (
      typeof payload.memberId !== 'string' ||
      typeof payload.stravaAthleteId !== 'string' ||
      typeof payload.name !== 'string'
    ) {
      return null;
    }

    return {
      memberId: payload.memberId,
      stravaAthleteId: payload.stravaAthleteId,
      name: payload.name,
    };
  } catch {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Clear the session cookie (logout)
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
