/**
 * Aggregate all MSW handlers for use in tests
 */
import { stravaHandlers } from './strava';

export const handlers = [...stravaHandlers];

// Re-export individual handler sets for selective use
export * from './strava';
