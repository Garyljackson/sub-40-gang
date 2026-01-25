import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { alice, aliceSession, bob, charlie } from '../fixtures/members';

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');

// Mock getSession
const mockGetSession = vi.fn();
vi.mock('@/lib/auth', () => ({
  getSession: () => mockGetSession(),
}));

// Mock getCurrentSeason
vi.mock('@/lib/timezone', () => ({
  getCurrentSeason: () => 2026,
}));

// Mock Supabase client
const mockAchievementsQuery = vi.fn();
const mockReactionsQuery = vi.fn();

vi.mock('@/lib/supabase-server', () => ({
  createServiceClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === 'achievements') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  lt: vi.fn().mockImplementation(() => mockAchievementsQuery()),
                  then: (resolve: (value: unknown) => void) =>
                    mockAchievementsQuery().then(resolve),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'reactions') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockImplementation(() => mockReactionsQuery()),
          }),
        };
      }
      return {};
    },
  })),
}));

// Import route handlers after mocking
import { GET } from '@/app/api/feed/route';

function createRequest(url: string = '/api/feed'): Request {
  return new Request(`http://localhost:3000${url}`, {
    method: 'GET',
  });
}

describe('GET /api/feed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('returns empty achievements array when no achievements exist', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);
    mockAchievementsQuery.mockResolvedValueOnce({ data: [], error: null });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.achievements).toEqual([]);
    expect(data.nextCursor).toBeNull();
    expect(data.hasMore).toBe(false);
  });

  it('returns achievements with member data', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);

    const mockAchievement = {
      id: 'ach-1',
      milestone: '10km',
      time_seconds: 2380,
      achieved_at: '2026-01-20T08:00:00',
      strava_activity_id: 'act-1005',
      member: {
        id: alice.id,
        name: alice.name,
        profile_photo_url: null,
      },
    };

    mockAchievementsQuery.mockResolvedValueOnce({
      data: [mockAchievement],
      error: null,
    });
    mockReactionsQuery.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.achievements).toHaveLength(1);
    expect(data.achievements[0]).toMatchObject({
      id: 'ach-1',
      milestone: '10km',
      timeSeconds: 2380,
      member: {
        id: alice.id,
        name: alice.name,
      },
    });
  });

  it('includes reactions with counts and hasReacted flag', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);

    const mockAchievement = {
      id: 'ach-1',
      milestone: '10km',
      time_seconds: 2380,
      achieved_at: '2026-01-20T08:00:00',
      strava_activity_id: 'act-1005',
      member: {
        id: bob.id,
        name: bob.name,
        profile_photo_url: null,
      },
    };

    mockAchievementsQuery.mockResolvedValueOnce({
      data: [mockAchievement],
      error: null,
    });

    mockReactionsQuery.mockResolvedValueOnce({
      data: [
        { achievement_id: 'ach-1', emoji: '🔥', member_id: alice.id },
        { achievement_id: 'ach-1', emoji: '🔥', member_id: charlie.id },
        { achievement_id: 'ach-1', emoji: '💪', member_id: alice.id },
      ],
      error: null,
    });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.achievements[0].reactions).toBeDefined();

    const fireReaction = data.achievements[0].reactions.find(
      (r: { emoji: string }) => r.emoji === '🔥'
    );
    expect(fireReaction.count).toBe(2);
    expect(fireReaction.hasReacted).toBe(true); // Alice reacted

    const muscleReaction = data.achievements[0].reactions.find(
      (r: { emoji: string }) => r.emoji === '💪'
    );
    expect(muscleReaction.count).toBe(1);
    expect(muscleReaction.hasReacted).toBe(true);
  });

  it('returns 500 when achievements query fails', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);
    mockAchievementsQuery.mockResolvedValueOnce({
      data: null,
      error: new Error('Database error'),
    });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch achievements' });
  });

  it('returns 500 when reactions query fails', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);

    mockAchievementsQuery.mockResolvedValueOnce({
      data: [
        {
          id: 'ach-1',
          milestone: '10km',
          time_seconds: 2380,
          achieved_at: '2026-01-20T08:00:00',
          strava_activity_id: 'act-1005',
          member: { id: alice.id, name: alice.name, profile_photo_url: null },
        },
      ],
      error: null,
    });

    mockReactionsQuery.mockResolvedValueOnce({
      data: null,
      error: new Error('Database error'),
    });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch reactions' });
  });

  it('calculates hasMore and nextCursor correctly', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);

    // Return exactly 20 items (default limit) to indicate hasMore
    const mockAchievements = Array.from({ length: 20 }, (_, i) => ({
      id: `ach-${i}`,
      milestone: '1km',
      time_seconds: 240,
      achieved_at: `2026-01-${String(20 - i).padStart(2, '0')}T08:00:00`,
      strava_activity_id: `act-${i}`,
      member: { id: alice.id, name: alice.name, profile_photo_url: null },
    }));

    mockAchievementsQuery.mockResolvedValueOnce({
      data: mockAchievements,
      error: null,
    });
    mockReactionsQuery.mockResolvedValueOnce({ data: [], error: null });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasMore).toBe(true);
    expect(data.nextCursor).toBe('2026-01-01T08:00:00');
  });
});
