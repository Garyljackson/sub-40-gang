import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { alice, aliceSession, bobSession } from '../fixtures/members';
import { aliceAchievements } from '../fixtures/achievements';

// Extract achievement ID for use in tests (we know fixtures have data)
const testAchievementId = aliceAchievements[0]!.id;

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');

// Mock getSession
const mockGetSession = vi.fn();
vi.mock('@/lib/auth', () => ({
  getSession: () => mockGetSession(),
}));

// Mock Supabase client
const mockUpsert = vi.fn();
const mockDelete = vi.fn();
const mockReactionsSelect = vi.fn();

const createMockBuilder = () => ({
  upsert: mockUpsert,
  delete: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: mockDelete,
      }),
    }),
  }),
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockImplementation(() => mockReactionsSelect()),
  }),
});

const mockFrom = vi.fn().mockImplementation(() => createMockBuilder());

vi.mock('@/lib/supabase-server', () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Import route handlers after mocking
import { DELETE, POST } from '@/app/api/reactions/route';

function createRequest(body: object, method: string = 'POST'): Request {
  return new Request('http://localhost:3000/api/reactions', {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/reactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
    mockReactionsSelect.mockResolvedValue({
      data: [{ emoji: '🔥', member_id: alice.id }],
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const request = createRequest({
      achievementId: testAchievementId,
      emoji: '🔥',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 when missing achievementId', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);

    const request = createRequest({
      emoji: '🔥',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Missing achievementId or emoji' });
  });

  it('returns 400 when missing emoji', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);

    const request = createRequest({
      achievementId: testAchievementId,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Missing achievementId or emoji' });
  });

  it('returns 400 for invalid emoji', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);

    const request = createRequest({
      achievementId: testAchievementId,
      emoji: '😀', // Not in allowed list
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Invalid emoji' });
  });

  it('adds reaction and returns updated counts for 🔥', async () => {
    mockGetSession.mockResolvedValueOnce(bobSession);

    const request = createRequest({
      achievementId: testAchievementId,
      emoji: '🔥',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.reactions).toBeDefined();
  });

  it('accepts all allowed emojis', async () => {
    const allowedEmojis = ['🎉', '👏', '🔥', '💪', '🍺', '🍆'];

    for (const emoji of allowedEmojis) {
      mockGetSession.mockResolvedValueOnce(aliceSession);
      mockUpsert.mockResolvedValueOnce({ error: null });

      const request = createRequest({
        achievementId: testAchievementId,
        emoji,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    }
  });

  it('returns 500 when upsert fails', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);
    mockUpsert.mockResolvedValueOnce({ error: new Error('Database error') });

    const request = createRequest({
      achievementId: testAchievementId,
      emoji: '🔥',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to add reaction' });
  });

  it('uses upsert for idempotent reaction addition', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);

    const request = createRequest({
      achievementId: 'test-achievement-id',
      emoji: '💪',
    });

    await POST(request);

    expect(mockFrom).toHaveBeenCalledWith('reactions');
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        achievement_id: 'test-achievement-id',
        member_id: alice.id,
        emoji: '💪',
      },
      {
        onConflict: 'achievement_id,member_id',
      }
    );
  });
});

describe('DELETE /api/reactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelete.mockResolvedValue({ error: null });
    mockReactionsSelect.mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const request = createRequest(
      {
        achievementId: testAchievementId,
        emoji: '🔥',
      },
      'DELETE'
    );

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 when missing achievementId', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);

    const request = createRequest({ emoji: '🔥' }, 'DELETE');

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Missing achievementId or emoji' });
  });

  it('returns 400 when missing emoji', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);

    const request = createRequest({ achievementId: testAchievementId }, 'DELETE');

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Missing achievementId or emoji' });
  });

  it('removes reaction and returns updated counts', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);

    const request = createRequest(
      {
        achievementId: testAchievementId,
        emoji: '🔥',
      },
      'DELETE'
    );

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.reactions).toBeDefined();
  });

  it('returns empty reactions array when all reactions removed', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);
    mockReactionsSelect.mockResolvedValueOnce({ data: [], error: null });

    const request = createRequest(
      {
        achievementId: testAchievementId,
        emoji: '🔥',
      },
      'DELETE'
    );

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reactions).toEqual([]);
  });

  it('returns 500 when delete fails', async () => {
    mockGetSession.mockResolvedValueOnce(aliceSession);
    mockDelete.mockResolvedValueOnce({ error: new Error('Database error') });

    const request = createRequest(
      {
        achievementId: testAchievementId,
        emoji: '🔥',
      },
      'DELETE'
    );

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to remove reaction' });
  });
});
