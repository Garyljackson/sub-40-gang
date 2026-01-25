/**
 * MSW handlers for Strava API mocking
 */
import { http, HttpResponse } from 'msw';
import { fastTenKmRun } from '../../fixtures/strava-streams';
import { runActivity } from '../../fixtures/activities';

const STRAVA_API = 'https://www.strava.com/api/v3';

export const stravaHandlers = [
  /**
   * Token exchange/refresh
   * POST /oauth/token
   */
  http.post(`${STRAVA_API}/oauth/token`, () => {
    return HttpResponse.json({
      access_token: 'mock-access-token-refreshed',
      refresh_token: 'mock-refresh-token-new',
      expires_at: Math.floor(Date.now() / 1000) + 21600, // 6 hours from now
      expires_in: 21600,
      token_type: 'Bearer',
      athlete: {
        id: 10001,
        firstname: 'Test',
        lastname: 'User',
        profile: 'https://example.com/avatar.jpg',
        profile_medium: 'https://example.com/avatar-medium.jpg',
      },
    });
  }),

  /**
   * Fetch activity details
   * GET /activities/:activityId
   */
  http.get(`${STRAVA_API}/activities/:activityId`, ({ params }) => {
    const activityId = Number(params.activityId);

    // Return cycle activity for specific ID to test filtering
    if (activityId === 999999) {
      return HttpResponse.json({
        ...runActivity,
        id: activityId,
        type: 'Ride',
        sport_type: 'Ride',
      });
    }

    return HttpResponse.json({
      ...runActivity,
      id: activityId,
    });
  }),

  /**
   * Fetch activity streams
   * GET /activities/:activityId/streams
   */
  http.get(`${STRAVA_API}/activities/:activityId/streams`, () => {
    return HttpResponse.json([
      {
        type: 'time',
        data: fastTenKmRun.time,
        series_type: 'time',
        original_size: fastTenKmRun.time.length,
        resolution: 'high',
      },
      {
        type: 'distance',
        data: fastTenKmRun.distance,
        series_type: 'distance',
        original_size: fastTenKmRun.distance.length,
        resolution: 'high',
      },
    ]);
  }),

  /**
   * Get authenticated athlete
   * GET /athlete
   */
  http.get(`${STRAVA_API}/athlete`, () => {
    return HttpResponse.json({
      id: 10001,
      username: 'testuser',
      resource_state: 3,
      firstname: 'Test',
      lastname: 'User',
      city: 'Brisbane',
      state: 'Queensland',
      country: 'Australia',
      sex: 'M',
      premium: false,
      summit: false,
      created_at: '2020-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      profile_medium: 'https://example.com/avatar-medium.jpg',
      profile: 'https://example.com/avatar.jpg',
    });
  }),
];

/**
 * Handler for Strava rate limit response (429)
 * Use with server.use() in specific tests
 */
export const stravaRateLimitHandler = http.get(`${STRAVA_API}/activities/:activityId`, () => {
  return new HttpResponse(null, {
    status: 429,
    headers: {
      'X-RateLimit-Limit': '100,1000',
      'X-RateLimit-Usage': '100,1000',
    },
  });
});

/**
 * Handler for Strava unauthorized response (401)
 * Use with server.use() in specific tests
 */
export const stravaUnauthorizedHandler = http.get(`${STRAVA_API}/activities/:activityId`, () => {
  return HttpResponse.json(
    {
      message: 'Authorization Error',
      errors: [{ resource: 'AccessToken', field: '', code: 'invalid' }],
    },
    { status: 401 }
  );
});

/**
 * Handler for Strava not found response (404)
 * Use with server.use() in specific tests
 */
export const stravaNotFoundHandler = http.get(`${STRAVA_API}/activities/:activityId`, () => {
  return HttpResponse.json(
    {
      message: 'Record Not Found',
      errors: [{ resource: 'Activity', field: 'id', code: 'not found' }],
    },
    { status: 404 }
  );
});

/**
 * Handler that returns empty streams
 * Use with server.use() in specific tests
 */
export const stravaEmptyStreamsHandler = http.get(
  `${STRAVA_API}/activities/:activityId/streams`,
  () => {
    return HttpResponse.json([
      { type: 'time', data: [], series_type: 'time' },
      { type: 'distance', data: [], series_type: 'distance' },
    ]);
  }
);
