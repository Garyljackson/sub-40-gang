import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { alice } from '../fixtures/members';

// Mock environment variables
vi.stubEnv('STRAVA_VERIFY_TOKEN', 'test-verify-token');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');

// Mock Supabase client
const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
const mockSingle = vi.fn();
const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({
  select: mockSelect,
  upsert: mockUpsert,
});

vi.mock('@/lib/supabase-server', () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Import route handlers after mocking
import { GET, POST } from '@/app/api/webhooks/strava/route';

function createRequest(url: string, options: { method?: string; body?: object } = {}): NextRequest {
  const { method = 'GET', body } = options;
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  });
}

describe('GET /api/webhooks/strava (verification)', () => {
  it('returns challenge when verify token matches', async () => {
    const request = createRequest(
      '/api/webhooks/strava?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=test-challenge'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ 'hub.challenge': 'test-challenge' });
  });

  it('returns 403 when verify token does not match', async () => {
    const request = createRequest(
      '/api/webhooks/strava?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=test-challenge'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({ error: 'Forbidden' });
  });

  it('returns 403 when mode is not subscribe', async () => {
    const request = createRequest(
      '/api/webhooks/strava?hub.mode=unsubscribe&hub.verify_token=test-verify-token&hub.challenge=test-challenge'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({ error: 'Forbidden' });
  });

  it('returns 403 when hub.mode is missing', async () => {
    const request = createRequest(
      '/api/webhooks/strava?hub.verify_token=test-verify-token&hub.challenge=test-challenge'
    );

    const response = await GET(request);

    expect(response.status).toBe(403);
  });

  it('returns 403 when hub.verify_token is missing', async () => {
    const request = createRequest(
      '/api/webhooks/strava?hub.mode=subscribe&hub.challenge=test-challenge'
    );

    const response = await GET(request);

    expect(response.status).toBe(403);
  });
});

describe('POST /api/webhooks/strava (events)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('queues activity create events for registered members', async () => {
    // Mock member lookup to return a registered member
    mockSingle.mockResolvedValueOnce({
      data: { id: alice.id },
      error: null,
    });

    const request = createRequest('/api/webhooks/strava', {
      method: 'POST',
      body: {
        object_type: 'activity',
        object_id: 123456789,
        aspect_type: 'create',
        owner_id: Number(alice.strava_athlete_id),
        subscription_id: 12345,
        event_time: 1700000000,
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ received: true });

    // Verify member lookup was called
    expect(mockFrom).toHaveBeenCalledWith('members');
    expect(mockSelect).toHaveBeenCalledWith('id');
    expect(mockEq).toHaveBeenCalledWith('strava_athlete_id', alice.strava_athlete_id);

    // Verify event was queued
    expect(mockFrom).toHaveBeenCalledWith('webhook_queue');
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        strava_activity_id: '123456789',
        strava_athlete_id: alice.strava_athlete_id,
        event_type: 'create',
        status: 'pending',
        attempts: 0,
      },
      {
        onConflict: 'strava_activity_id',
        ignoreDuplicates: true,
      }
    );
  });

  it('ignores non-activity events', async () => {
    const request = createRequest('/api/webhooks/strava', {
      method: 'POST',
      body: {
        object_type: 'athlete',
        object_id: 10001,
        aspect_type: 'update',
        owner_id: 10001,
        subscription_id: 12345,
        event_time: 1700000000,
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ received: true });

    // Should not query members or queue anything
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('ignores non-create events', async () => {
    const request = createRequest('/api/webhooks/strava', {
      method: 'POST',
      body: {
        object_type: 'activity',
        object_id: 123456789,
        aspect_type: 'update',
        owner_id: 10001,
        subscription_id: 12345,
        event_time: 1700000000,
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ received: true });

    // Should not query members or queue anything
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('ignores delete events', async () => {
    const request = createRequest('/api/webhooks/strava', {
      method: 'POST',
      body: {
        object_type: 'activity',
        object_id: 123456789,
        aspect_type: 'delete',
        owner_id: 10001,
        subscription_id: 12345,
        event_time: 1700000000,
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('ignores events for unregistered athletes', async () => {
    // Mock member lookup to return no member
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const request = createRequest('/api/webhooks/strava', {
      method: 'POST',
      body: {
        object_type: 'activity',
        object_id: 123456789,
        aspect_type: 'create',
        owner_id: 99999, // Not a registered member
        subscription_id: 12345,
        event_time: 1700000000,
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ received: true });

    // Should have checked for member
    expect(mockFrom).toHaveBeenCalledWith('members');
    // But should not have queued anything
    expect(mockFrom).not.toHaveBeenCalledWith('webhook_queue');
  });

  it('always returns 200 even on database errors', async () => {
    // Mock member lookup to throw an error
    mockSingle.mockRejectedValueOnce(new Error('Database error'));

    const request = createRequest('/api/webhooks/strava', {
      method: 'POST',
      body: {
        object_type: 'activity',
        object_id: 123456789,
        aspect_type: 'create',
        owner_id: 10001,
        subscription_id: 12345,
        event_time: 1700000000,
      },
    });

    const response = await POST(request);
    const data = await response.json();

    // Should still return 200 to prevent Strava retries
    expect(response.status).toBe(200);
    expect(data).toEqual({ received: true });
  });

  it('handles duplicate events idempotently', async () => {
    // Mock member lookup
    mockSingle.mockResolvedValueOnce({
      data: { id: alice.id },
      error: null,
    });

    // First event
    const request1 = createRequest('/api/webhooks/strava', {
      method: 'POST',
      body: {
        object_type: 'activity',
        object_id: 123456789,
        aspect_type: 'create',
        owner_id: Number(alice.strava_athlete_id),
        subscription_id: 12345,
        event_time: 1700000000,
      },
    });

    await POST(request1);

    // Verify upsert was called with ignoreDuplicates
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        ignoreDuplicates: true,
      })
    );
  });
});
