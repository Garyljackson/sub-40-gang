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

export interface ProcessActivityResult {
  newAchievements: ProcessedMilestone[];
  activityProcessed: boolean;
}

/**
 * Process an activity and calculate achievements
 * @param memberId - The member's database ID
 * @param activity - The Strava activity details
 * @param streams - The time and distance streams from Strava
 * @returns Array of newly unlocked milestones
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

  // Fetch existing achievements for this member/season
  const { data: existingAchievements, error: fetchError } = await supabase
    .from('achievements')
    .select('milestone')
    .eq('member_id', memberId)
    .eq('season', season);

  if (fetchError) {
    throw new Error(`Failed to fetch existing achievements: ${fetchError.message}`);
  }

  const achievedMilestones = new Set(existingAchievements?.map((a) => a.milestone) ?? []);

  // Find milestones that haven't been achieved yet
  const unachievedMilestones = MILESTONE_KEYS.filter((key) => !achievedMilestones.has(key));

  if (unachievedMilestones.length === 0) {
    // All milestones achieved for this season
    await upsertProcessedActivity(memberId, activity, []);
    return { newAchievements: [], activityProcessed: true };
  }

  // Calculate best efforts for unachieved milestones
  const newAchievements: ProcessedMilestone[] = [];

  for (const milestoneKey of unachievedMilestones) {
    const milestone = MILESTONES[milestoneKey];
    const bestEffort = findBestEffort(streams.time, streams.distance, milestone.distanceMeters);

    if (bestEffort && beatsMilestone(milestoneKey, bestEffort.timeSeconds)) {
      newAchievements.push({
        milestone: milestoneKey,
        timeSeconds: bestEffort.timeSeconds,
        distanceMeters: bestEffort.distanceMeters,
      });
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

  // Upsert to processed_activities table for "last synced run" visibility
  await upsertProcessedActivity(
    memberId,
    activity,
    newAchievements.map((a) => a.milestone)
  );

  return { newAchievements, activityProcessed: true };
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
