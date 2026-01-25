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
const mockMembersQuery = vi.fn();
const mockAchievementsQuery = vi.fn();

vi.mock('@/lib/supabase-server', () => ({
  createServiceClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === 'members') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockImplementation(() => mockMembersQuery()),
          }),
        };
      }
      if (table === 'achievements') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => mockAchievementsQuery()),
          }),
        };
      }
      return {};
    },
  })),
}));

// Import route handlers after mocking
import { GET } from '@/app/api/leaderboard/route';

function createRequest(url: string = '/api/leaderboard'): Request {
  return new Request(`http://localhost:3000${url}`, {
    method: 'GET',
  });
}

describe('GET /api/leaderboard', () => {
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

  it('returns all members even with no achievements', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);

    mockMembersQuery.mockResolvedValueOnce({
      data: [
        {
          id: alice.id,
          name: alice.name,
          profile_photo_url: null,
          joined_at: '2026-01-01',
        },
        {
          id: bob.id,
          name: bob.name,
          profile_photo_url: null,
          joined_at: '2026-01-05',
        },
      ],
      error: null,
    });
    mockAchievementsQuery.mockResolvedValueOnce({ data: [], error: null });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.entries).toHaveLength(2);
    expect(data.entries[0].totalMilestones).toBe(0);
    expect(data.entries[1].totalMilestones).toBe(0);
  });

  it('sorts by milestone count (descending)', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);

    mockMembersQuery.mockResolvedValueOnce({
      data: [
        { id: alice.id, name: alice.name, profile_photo_url: null, joined_at: '2026-01-01' },
        { id: bob.id, name: bob.name, profile_photo_url: null, joined_at: '2026-01-05' },
        { id: charlie.id, name: charlie.name, profile_photo_url: null, joined_at: '2026-01-10' },
      ],
      error: null,
    });

    mockAchievementsQuery.mockResolvedValueOnce({
      data: [
        // Alice has 5 milestones
        { member_id: alice.id, milestone: '1km', time_seconds: 235 },
        { member_id: alice.id, milestone: '2km', time_seconds: 472 },
        { member_id: alice.id, milestone: '5km', time_seconds: 1185 },
        { member_id: alice.id, milestone: '7.5km', time_seconds: 1780 },
        { member_id: alice.id, milestone: '10km', time_seconds: 2380 },
        // Bob has 2 milestones
        { member_id: bob.id, milestone: '1km', time_seconds: 238 },
        { member_id: bob.id, milestone: '2km', time_seconds: 478 },
        // Charlie has 1 milestone
        { member_id: charlie.id, milestone: '1km', time_seconds: 239 },
      ],
      error: null,
    });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.entries).toHaveLength(3);

    // Alice should be first (5 milestones)
    expect(data.entries[0].member.name).toBe(alice.name);
    expect(data.entries[0].totalMilestones).toBe(5);
    expect(data.entries[0].rank).toBe(1);

    // Bob should be second (2 milestones)
    expect(data.entries[1].member.name).toBe(bob.name);
    expect(data.entries[1].totalMilestones).toBe(2);
    expect(data.entries[1].rank).toBe(2);

    // Charlie should be third (1 milestone)
    expect(data.entries[2].member.name).toBe(charlie.name);
    expect(data.entries[2].totalMilestones).toBe(1);
    expect(data.entries[2].rank).toBe(3);
  });

  it('breaks ties by best milestone rank', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);

    mockMembersQuery.mockResolvedValueOnce({
      data: [
        { id: alice.id, name: alice.name, profile_photo_url: null, joined_at: '2026-01-01' },
        { id: bob.id, name: bob.name, profile_photo_url: null, joined_at: '2026-01-05' },
      ],
      error: null,
    });

    mockAchievementsQuery.mockResolvedValueOnce({
      data: [
        // Both have 2 milestones, but Alice has better milestone (5km vs 2km)
        { member_id: alice.id, milestone: '1km', time_seconds: 235 },
        { member_id: alice.id, milestone: '5km', time_seconds: 1185 },
        { member_id: bob.id, milestone: '1km', time_seconds: 238 },
        { member_id: bob.id, milestone: '2km', time_seconds: 478 },
      ],
      error: null,
    });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);

    // Both have 2 milestones, but Alice has 5km (rank 3) vs Bob's 2km (rank 2)
    expect(data.entries[0].member.name).toBe(alice.name);
    expect(data.entries[0].bestMilestone).toBe('5km');
    expect(data.entries[1].member.name).toBe(bob.name);
    expect(data.entries[1].bestMilestone).toBe('2km');
  });

  it('includes current member ID in response', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);
    mockMembersQuery.mockResolvedValueOnce({ data: [], error: null });
    mockAchievementsQuery.mockResolvedValueOnce({ data: [], error: null });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.currentMemberId).toBe(alice.id);
  });

  it('includes season in response', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);
    mockMembersQuery.mockResolvedValueOnce({ data: [], error: null });
    mockAchievementsQuery.mockResolvedValueOnce({ data: [], error: null });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.season).toBe(2026);
  });

  it('includes milestone data with times', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);

    mockMembersQuery.mockResolvedValueOnce({
      data: [{ id: alice.id, name: alice.name, profile_photo_url: null, joined_at: '2026-01-01' }],
      error: null,
    });

    mockAchievementsQuery.mockResolvedValueOnce({
      data: [
        { member_id: alice.id, milestone: '1km', time_seconds: 235 },
        { member_id: alice.id, milestone: '10km', time_seconds: 2380 },
      ],
      error: null,
    });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);

    const aliceEntry = data.entries[0];
    expect(aliceEntry.milestones['1km']).toEqual({ achieved: true, timeSeconds: 235 });
    expect(aliceEntry.milestones['10km']).toEqual({ achieved: true, timeSeconds: 2380 });
    expect(aliceEntry.milestones['5km']).toBeUndefined();
  });

  it('returns 500 when members query fails', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);
    mockMembersQuery.mockResolvedValueOnce({
      data: null,
      error: new Error('Database error'),
    });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch members' });
  });

  it('returns 500 when achievements query fails', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);
    mockMembersQuery.mockResolvedValueOnce({
      data: [{ id: alice.id, name: alice.name, profile_photo_url: null, joined_at: '2026-01-01' }],
      error: null,
    });
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
});
