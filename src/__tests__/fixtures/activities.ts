/**
 * Test fixtures for Strava activity objects
 * Used for testing webhook processing and activity handling
 */

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  athlete: { id: number };
}

/**
 * A typical run activity - 10km morning run
 */
export const runActivity: StravaActivity = {
  id: 123456789,
  name: 'Morning Run',
  type: 'Run',
  sport_type: 'Run',
  start_date: '2026-01-15T08:00:00Z',
  start_date_local: '2026-01-15T18:00:00',
  distance: 10000,
  moving_time: 2380,
  elapsed_time: 2450,
  total_elevation_gain: 50,
  athlete: { id: 10001 },
};

/**
 * A cycling activity - should be skipped by processor
 */
export const cycleActivity: StravaActivity = {
  id: 123456790,
  name: 'Morning Ride',
  type: 'Ride',
  sport_type: 'Ride',
  start_date: '2026-01-16T07:00:00Z',
  start_date_local: '2026-01-16T17:00:00',
  distance: 25000,
  moving_time: 3600,
  elapsed_time: 3700,
  total_elevation_gain: 150,
  athlete: { id: 10001 },
};

/**
 * A virtual run (treadmill) - still counts as a run
 */
export const virtualRunActivity: StravaActivity = {
  id: 123456791,
  name: 'Treadmill Session',
  type: 'VirtualRun',
  sport_type: 'VirtualRun',
  start_date: '2026-01-17T06:00:00Z',
  start_date_local: '2026-01-17T16:00:00',
  distance: 5000,
  moving_time: 1200,
  elapsed_time: 1200,
  total_elevation_gain: 0,
  athlete: { id: 10001 },
};

/**
 * A short run - 2km
 */
export const shortRunActivity: StravaActivity = {
  id: 123456792,
  name: 'Quick Jog',
  type: 'Run',
  sport_type: 'Run',
  start_date: '2026-01-18T12:00:00Z',
  start_date_local: '2026-01-18T22:00:00',
  distance: 2000,
  moving_time: 480,
  elapsed_time: 500,
  total_elevation_gain: 10,
  athlete: { id: 10002 },
};

/**
 * Activity from before member joined - should be skipped
 */
export const activityBeforeJoin: StravaActivity = {
  id: 123456793,
  name: 'Old Run',
  type: 'Run',
  sport_type: 'Run',
  start_date: '2025-12-15T08:00:00Z', // Before 2026
  start_date_local: '2025-12-15T18:00:00',
  distance: 10000,
  moving_time: 2400,
  elapsed_time: 2500,
  total_elevation_gain: 45,
  athlete: { id: 10001 },
};

/**
 * Trail run activity
 */
export const trailRunActivity: StravaActivity = {
  id: 123456794,
  name: 'Trail Adventure',
  type: 'Run',
  sport_type: 'TrailRun',
  start_date: '2026-01-19T05:00:00Z',
  start_date_local: '2026-01-19T15:00:00',
  distance: 8000,
  moving_time: 2400,
  elapsed_time: 2600,
  total_elevation_gain: 200,
  athlete: { id: 10003 },
};

/**
 * A walk activity - should be skipped
 */
export const walkActivity: StravaActivity = {
  id: 123456795,
  name: 'Evening Walk',
  type: 'Walk',
  sport_type: 'Walk',
  start_date: '2026-01-20T17:00:00Z',
  start_date_local: '2026-01-21T03:00:00',
  distance: 3000,
  moving_time: 1800,
  elapsed_time: 1900,
  total_elevation_gain: 15,
  athlete: { id: 10001 },
};
