/**
 * Supabase client mock utilities for testing
 * Provides mock implementations for Supabase queries
 */
import { vi } from 'vitest';

/**
 * Create a mock Supabase query builder
 * Supports chaining and returns configurable data
 */
export function createMockQueryBuilder<T>(data: T | T[] | null = null, error: Error | null = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    then: vi.fn((resolve) => resolve({ data, error })),
  };

  return builder;
}

/**
 * Create a mock Supabase client
 */
export function createMockSupabaseClient() {
  const defaultBuilder = createMockQueryBuilder();

  return {
    from: vi.fn().mockReturnValue(defaultBuilder),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  };
}

/**
 * Mock session data for authenticated requests
 */
export interface MockSession {
  memberId: string;
  stravaAthleteId: string;
  name: string;
}

/**
 * Create a mock getSession function
 */
export function createMockGetSession(session: MockSession | null) {
  return vi.fn().mockResolvedValue(session);
}

/**
 * Helper to set up Supabase mock for a test
 */
export function setupSupabaseMock(queryResults: Record<string, unknown>) {
  const client = createMockSupabaseClient();

  // Configure from() to return appropriate builders based on table name
  client.from.mockImplementation((table: string) => {
    const data = queryResults[table] ?? null;
    return createMockQueryBuilder(data);
  });

  return client;
}
