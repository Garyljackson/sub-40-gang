/**
 * Test fixtures for achievement data
 * Matches the seed.sql test data for consistency
 */

import type { MilestoneKey } from '@/lib/milestones';
import { alice, bob, charlie } from './members';

export interface TestAchievement {
  id: string;
  member_id: string;
  milestone: MilestoneKey;
  season: number;
  strava_activity_id: string;
  achieved_at: Date;
  distance: number;
  time_seconds: number;
}

// Alice's achievements (all milestones)
export const aliceAchievements: TestAchievement[] = [
  {
    id: 'ach-alice-1km',
    member_id: alice.id,
    milestone: '1km',
    season: 2026,
    strava_activity_id: 'act-1001',
    achieved_at: new Date('2026-01-02T08:00:00'),
    distance: 1000,
    time_seconds: 235, // 3:55
  },
  {
    id: 'ach-alice-2km',
    member_id: alice.id,
    milestone: '2km',
    season: 2026,
    strava_activity_id: 'act-1002',
    achieved_at: new Date('2026-01-05T08:00:00'),
    distance: 2000,
    time_seconds: 472, // 7:52
  },
  {
    id: 'ach-alice-5km',
    member_id: alice.id,
    milestone: '5km',
    season: 2026,
    strava_activity_id: 'act-1003',
    achieved_at: new Date('2026-01-10T08:00:00'),
    distance: 5000,
    time_seconds: 1185, // 19:45
  },
  {
    id: 'ach-alice-7.5km',
    member_id: alice.id,
    milestone: '7.5km',
    season: 2026,
    strava_activity_id: 'act-1004',
    achieved_at: new Date('2026-01-15T08:00:00'),
    distance: 7500,
    time_seconds: 1780, // 29:40
  },
  {
    id: 'ach-alice-10km',
    member_id: alice.id,
    milestone: '10km',
    season: 2026,
    strava_activity_id: 'act-1005',
    achieved_at: new Date('2026-01-20T08:00:00'),
    distance: 10000,
    time_seconds: 2380, // 39:40
  },
];

// Bob's achievements (partial)
export const bobAchievements: TestAchievement[] = [
  {
    id: 'ach-bob-1km',
    member_id: bob.id,
    milestone: '1km',
    season: 2026,
    strava_activity_id: 'act-2001',
    achieved_at: new Date('2026-01-06T09:00:00'),
    distance: 1000,
    time_seconds: 238, // 3:58
  },
  {
    id: 'ach-bob-2km',
    member_id: bob.id,
    milestone: '2km',
    season: 2026,
    strava_activity_id: 'act-2002',
    achieved_at: new Date('2026-01-10T09:00:00'),
    distance: 2000,
    time_seconds: 478, // 7:58
  },
];

// Charlie's achievements (just started)
export const charlieAchievements: TestAchievement[] = [
  {
    id: 'ach-charlie-1km',
    member_id: charlie.id,
    milestone: '1km',
    season: 2026,
    strava_activity_id: 'act-3001',
    achieved_at: new Date('2026-01-12T07:00:00'),
    distance: 1000,
    time_seconds: 239, // 3:59
  },
];

/**
 * All test achievements combined
 */
export const allAchievements: TestAchievement[] = [
  ...aliceAchievements,
  ...bobAchievements,
  ...charlieAchievements,
];

/**
 * Get achievements for a specific member
 */
export function getAchievementsForMember(memberId: string): TestAchievement[] {
  return allAchievements.filter((a) => a.member_id === memberId);
}

/**
 * Get achievements for a specific season
 */
export function getAchievementsForSeason(season: number): TestAchievement[] {
  return allAchievements.filter((a) => a.season === season);
}
