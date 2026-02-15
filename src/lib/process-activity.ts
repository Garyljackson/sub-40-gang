import { createServiceClient } from './supabase-server';
import { findBestEffort } from './best-effort';
import { MILESTONES, MILESTONE_KEYS, beatsMilestone, type MilestoneKey } from './milestones';
import { getSeasonForDate } from './timezone';
import type { StravaActivity } from './strava';

export interface ProcessedMilestone {
  milestone: MilestoneKey;
  timeSeconds: number;
  distanceMeters: number;
}

export interface ProcessedImprovement {
  milestone: MilestoneKey;
  timeSeconds: number;
  previousTimeSeconds: number;
  distanceMeters: number;
}

export interface ProcessActivityResult {
  newAchievements: ProcessedMilestone[];
  newImprovements: ProcessedImprovement[];
  activityProcessed: boolean;
}

/**
 * Process an activity and calculate achievements
 * @param memberId - The member's database ID
 * @param activity - The Strava activity details
 * @param streams - The time and distance streams from Strava
 * @returns Array of newly unlocked milestones and improvements
 */
export async function processActivity(
  memberId: string,
  activity: StravaActivity,
  streams: { time: number[]; distance: number[] }
): Promise<ProcessActivityResult> {
  const supabase = createServiceClient();

  // Calculate season from activity date (Brisbane time)
  const activityDate = new Date(activity.start_date);
  const season = getSeasonForDate(activityDate);

  // Fetch existing achievements for this member/season (including time for improvement comparison)
  const { data: existingAchievements, error: fetchError } = await supabase
    .from('achievements')
    .select('milestone, time_seconds')
    .eq('member_id', memberId)
    .eq('season', season);

  if (fetchError) {
    throw new Error(`Failed to fetch existing achievements: ${fetchError.message}`);
  }

  // Build a map of best (lowest) time per milestone
  const bestTimeByMilestone = new Map<MilestoneKey, number>();
  for (const a of existingAchievements ?? []) {
    const existing = bestTimeByMilestone.get(a.milestone);
    if (existing === undefined || a.time_seconds < existing) {
      bestTimeByMilestone.set(a.milestone, a.time_seconds);
    }
  }

  const newAchievements: ProcessedMilestone[] = [];
  const newImprovements: ProcessedImprovement[] = [];

  for (const milestoneKey of MILESTONE_KEYS) {
    const milestone = MILESTONES[milestoneKey];
    const bestEffort = findBestEffort(streams.time, streams.distance, milestone.distanceMeters);

    if (!bestEffort) continue;

    const existingBestTime = bestTimeByMilestone.get(milestoneKey);

    if (existingBestTime === undefined) {
      // Not yet achieved — check if this run beats the target
      if (beatsMilestone(milestoneKey, bestEffort.timeSeconds)) {
        newAchievements.push({
          milestone: milestoneKey,
          timeSeconds: bestEffort.timeSeconds,
          distanceMeters: bestEffort.distanceMeters,
        });
      }
    } else {
      // Already achieved — check if this run is strictly faster
      const roundedTime = Math.round(bestEffort.timeSeconds);
      if (roundedTime < existingBestTime) {
        newImprovements.push({
          milestone: milestoneKey,
          timeSeconds: bestEffort.timeSeconds,
          previousTimeSeconds: existingBestTime,
          distanceMeters: bestEffort.distanceMeters,
        });
      }
    }
  }

  // Insert new achievements
  if (newAchievements.length > 0) {
    const achievementInserts = newAchievements.map((achievement) => ({
      member_id: memberId,
      milestone: achievement.milestone,
      season,
      strava_activity_id: String(activity.id),
      achieved_at: activity.start_date,
      time_seconds: Math.round(achievement.timeSeconds),
      distance: achievement.distanceMeters,
    }));

    const { error: insertError } = await supabase.from('achievements').insert(achievementInserts);

    if (insertError) {
      throw new Error(`Failed to insert achievements: ${insertError.message}`);
    }
  }

  // Insert improvements (new rows with previous_time_seconds set)
  if (newImprovements.length > 0) {
    const improvementInserts = newImprovements.map((improvement) => ({
      member_id: memberId,
      milestone: improvement.milestone,
      season,
      strava_activity_id: String(activity.id),
      achieved_at: activity.start_date,
      time_seconds: Math.round(improvement.timeSeconds),
      distance: improvement.distanceMeters,
      previous_time_seconds: improvement.previousTimeSeconds,
    }));

    const { error: insertError } = await supabase.from('achievements').insert(improvementInserts);

    if (insertError) {
      throw new Error(`Failed to insert improvements: ${insertError.message}`);
    }
  }

  // Upsert to processed_activities table for "last synced run" visibility
  const allMilestones = [
    ...newAchievements.map((a) => a.milestone),
    ...newImprovements.map((i) => i.milestone),
  ];
  await upsertProcessedActivity(memberId, activity, allMilestones);

  return { newAchievements, newImprovements, activityProcessed: true };
}

async function upsertProcessedActivity(
  memberId: string,
  activity: StravaActivity,
  milestonesUnlocked: MilestoneKey[]
): Promise<void> {
  const supabase = createServiceClient();

  // Calculate pace in seconds per km
  const paceSecondsPerKm =
    activity.distance > 0 ? (activity.moving_time / activity.distance) * 1000 : 0;

  const { error } = await supabase.from('processed_activities').upsert(
    {
      member_id: memberId,
      strava_activity_id: String(activity.id),
      activity_name: activity.name,
      activity_date: activity.start_date,
      distance_meters: activity.distance,
      moving_time_seconds: activity.moving_time,
      pace_seconds_per_km: Math.round(paceSecondsPerKm),
      milestones_unlocked: milestonesUnlocked.length > 0 ? milestonesUnlocked : null,
      processed_at: new Date().toISOString(),
    },
    {
      onConflict: 'strava_activity_id',
    }
  );

  if (error) {
    // Log but don't throw - processed_activities is for visibility, not critical
    console.error('Failed to upsert processed activity:', error.message);
  }
}
