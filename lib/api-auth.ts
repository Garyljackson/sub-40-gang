import { NextResponse } from 'next/server';
import { getSession, type SessionPayload } from './auth';

export type AuthenticatedHandler<T = unknown> = (
  request: Request,
  session: SessionPayload
) => Promise<NextResponse<T>>;

/**
 * Higher-order function that wraps an API route handler with authentication
 * Returns 401 if no valid session exists
 */
export function withAuth<T = unknown>(handler: AuthenticatedHandler<T>) {
  return async (request: Request): Promise<NextResponse> => {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return handler(request, session);
  };
}
