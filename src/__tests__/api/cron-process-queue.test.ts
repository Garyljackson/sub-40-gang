import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { alice } from '../fixtures/members';
import { runActivity, cycleActivity } from '../fixtures/activities';

// Mock environment variables
vi.stubEnv('CRON_SECRET', 'test-cron-secret');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');

// Mock Strava functions
const mockGetValidToken = vi.fn();
const mockFetchActivity = vi.fn();
const mockFetchActivityStreams = vi.fn();

vi.mock('@/lib/strava', () => ({
  getValidToken: () => mockGetValidToken(),
  fetchActivity: (...args: unknown[]) => mockFetchActivity(...args),
  fetchActivityStreams: (...args: unknown[]) => mockFetchActivityStreams(...args),
  StravaRateLimitError: class StravaRateLimitError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'StravaRateLimitError';
    }
  },
}));

// Mock processActivity
const mockProcessActivity = vi.fn();
vi.mock('@/lib/process-activity', () => ({
  processActivity: (...args: unknown[]) => mockProcessActivity(...args),
}));

// Mock Supabase client
const mockQueueSelect = vi.fn();
const mockQueueUpdate = vi.fn();
const mockMemberSelect = vi.fn();

const mockFrom = vi.fn().mockImplementation((table: string) => {
  if (table === 'webhook_queue') {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => mockQueueSelect()),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockImplementation(() => mockQueueUpdate()),
      }),
    };
  }
  if (table === 'members') {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockImplementation(() => mockMemberSelect()),
        }),
      }),
    };
  }
  return {};
});

vi.mock('@/lib/supabase-server', () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Import route handlers after mocking
import { GET } from '@/app/api/cron/process-queue/route';

// Import the mocked StravaRateLimitError for use in tests
import { StravaRateLimitError } from '@/lib/strava';

function createRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) {
    headers.set('Authorization', authHeader);
  }
  return new NextRequest(new URL('http://localhost:3000/api/cron/process-queue'), {
    headers,
  });
}

describe('GET /api/cron/process-queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueueUpdate.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('returns 401 without authorization header', async () => {
      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('returns 401 with invalid authorization header', async () => {
      const request = createRequest('Bearer wrong-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('returns 401 with malformed authorization header', async () => {
      const request = createRequest('InvalidFormat test-cron-secret');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe('queue processing', () => {
    const validAuthHeader = 'Bearer test-cron-secret';

    it('returns message when no items to process', async () => {
      mockQueueSelect.mockResolvedValueOnce({ data: [], error: null });

      const request = createRequest(validAuthHeader);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        processed: 0,
        failed: 0,
        message: 'No items to process',
      });
    });

    it('processes pending queue items successfully', async () => {
      const queueItem = {
        id: 'queue-1',
        strava_activity_id: '123456789',
        strava_athlete_id: alice.strava_athlete_id,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
      };

      mockQueueSelect.mockResolvedValueOnce({ data: [queueItem], error: null });
      mockMemberSelect.mockResolvedValueOnce({
        data: { id: alice.id, joined_at: '2026-01-01' },
        error: null,
      });
      mockGetValidToken.mockResolvedValueOnce('mock-access-token');
      mockFetchActivity.mockResolvedValueOnce(runActivity);
      mockFetchActivityStreams.mockResolvedValueOnce({
        time: [0, 60, 120],
        distance: [0, 250, 500],
      });
      mockProcessActivity.mockResolvedValueOnce({
        newAchievements: [{ milestone: '1km' }],
        newImprovements: [],
        activityProcessed: true,
      });

      const request = createRequest(validAuthHeader);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(1);
      expect(data.failed).toBe(0);
    });

    it('skips non-Run activities', async () => {
      const queueItem = {
        id: 'queue-1',
        strava_activity_id: '123456789',
        strava_athlete_id: alice.strava_athlete_id,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
      };

      mockQueueSelect.mockResolvedValueOnce({ data: [queueItem], error: null });
      mockMemberSelect.mockResolvedValueOnce({
        data: { id: alice.id, joined_at: '2026-01-01' },
        error: null,
      });
      mockGetValidToken.mockResolvedValueOnce('mock-access-token');
      mockFetchActivity.mockResolvedValueOnce(cycleActivity); // Returns cycling activity

      const request = createRequest(validAuthHeader);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(1);

      // Should have marked as completed with skip message
      expect(mockQueueUpdate).toHaveBeenCalled();
    });

    it('skips activities before member join date', async () => {
      const queueItem = {
        id: 'queue-1',
        strava_activity_id: '123456789',
        strava_athlete_id: alice.strava_athlete_id,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
      };

      mockQueueSelect.mockResolvedValueOnce({ data: [queueItem], error: null });
      mockMemberSelect.mockResolvedValueOnce({
        data: { id: alice.id, joined_at: '2026-02-01' }, // Joined after activity
        error: null,
      });
      mockGetValidToken.mockResolvedValueOnce('mock-access-token');
      mockFetchActivity.mockResolvedValueOnce({
        ...runActivity,
        start_date: '2026-01-15T08:00:00Z', // Before join date
      });

      const request = createRequest(validAuthHeader);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(1);
    });

    it('handles rate limits by keeping item pending', async () => {
      const queueItem = {
        id: 'queue-1',
        strava_activity_id: '123456789',
        strava_athlete_id: alice.strava_athlete_id,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
      };

      mockQueueSelect.mockResolvedValueOnce({ data: [queueItem], error: null });
      mockMemberSelect.mockResolvedValueOnce({
        data: { id: alice.id, joined_at: '2026-01-01' },
        error: null,
      });
      mockGetValidToken.mockResolvedValueOnce('mock-access-token');
      mockFetchActivity.mockRejectedValueOnce(new StravaRateLimitError('Rate limited'));

      const request = createRequest(validAuthHeader);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Rate limit doesn't count as failed
      expect(data.processed).toBe(0);
      expect(data.failed).toBe(0);
    });

    it('marks item as failed after max attempts', async () => {
      const queueItem = {
        id: 'queue-1',
        strava_activity_id: '123456789',
        strava_athlete_id: alice.strava_athlete_id,
        status: 'pending',
        attempts: 2, // Already tried twice
        max_attempts: 3,
      };

      mockQueueSelect.mockResolvedValueOnce({ data: [queueItem], error: null });
      mockMemberSelect.mockResolvedValueOnce({
        data: { id: alice.id, joined_at: '2026-01-01' },
        error: null,
      });
      mockGetValidToken.mockRejectedValueOnce(new Error('Token refresh failed'));

      const request = createRequest(validAuthHeader);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.failed).toBe(1);
    });

    it('keeps item pending for retry when under max attempts', async () => {
      const queueItem = {
        id: 'queue-1',
        strava_activity_id: '123456789',
        strava_athlete_id: alice.strava_athlete_id,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
      };

      mockQueueSelect.mockResolvedValueOnce({ data: [queueItem], error: null });
      mockMemberSelect.mockResolvedValueOnce({
        data: { id: alice.id, joined_at: '2026-01-01' },
        error: null,
      });
      mockGetValidToken.mockRejectedValueOnce(new Error('Token refresh failed'));

      const request = createRequest(validAuthHeader);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.failed).toBe(1);
    });

    it('returns 500 when queue fetch fails', async () => {
      mockQueueSelect.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const request = createRequest(validAuthHeader);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Queue processing failed');
    });
  });
});
