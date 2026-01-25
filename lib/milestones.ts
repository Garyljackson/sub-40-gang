import type { Database } from './database.types';

export type MilestoneKey = Database['public']['Enums']['milestone_type'];

export interface Milestone {
  key: MilestoneKey;
  distanceMeters: number;
  targetTimeSeconds: number;
  displayName: string;
}

// Target pace: 4:00/km
// 1km = 4:00, 2km = 8:00, 5km = 20:00, 7.5km = 30:00, 10km = 40:00
export const MILESTONES: Record<MilestoneKey, Milestone> = {
  '1km': {
    key: '1km',
    distanceMeters: 1000,
    targetTimeSeconds: 4 * 60, // 4:00
    displayName: '1 km',
  },
  '2km': {
    key: '2km',
    distanceMeters: 2000,
    targetTimeSeconds: 8 * 60, // 8:00
    displayName: '2 km',
  },
  '5km': {
    key: '5km',
    distanceMeters: 5000,
    targetTimeSeconds: 20 * 60, // 20:00
    displayName: '5 km',
  },
  '7.5km': {
    key: '7.5km',
    distanceMeters: 7500,
    targetTimeSeconds: 30 * 60, // 30:00
    displayName: '7.5 km',
  },
  '10km': {
    key: '10km',
    distanceMeters: 10000,
    targetTimeSeconds: 40 * 60, // 40:00
    displayName: '10 km',
  },
};

export const MILESTONE_KEYS: MilestoneKey[] = ['1km', '2km', '5km', '7.5km', '10km'];

/**
 * Check if a given time beats the milestone target
 * @param milestone - The milestone to check against
 * @param timeSeconds - The time achieved in seconds
 * @returns true if the time is less than or equal to the target
 */
export function beatsMilestone(milestone: MilestoneKey, timeSeconds: number): boolean {
  const target = MILESTONES[milestone];
  return timeSeconds <= target.targetTimeSeconds;
}

/**
 * Format time in seconds to MM:SS display format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
