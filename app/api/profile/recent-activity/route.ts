import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import type { RecentActivityResponse, RecentActivity } from '@/lib/types';
import type { MilestoneKey } from '@/lib/milestones';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: activity, error } = await supabase
    .from('processed_activities')
    .select('*')
    .eq('member_id', session.memberId)
    .order('activity_date', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }

  const response: RecentActivityResponse = {
    activity: activity
      ? ({
          id: activity.id,
          name: activity.activity_name,
          distanceMeters: activity.distance_meters,
          movingTimeSeconds: activity.moving_time_seconds,
          paceSecondsPerKm: activity.pace_seconds_per_km,
          activityDate: activity.activity_date,
          stravaActivityId: activity.strava_activity_id,
          milestonesUnlocked: (activity.milestones_unlocked || []) as MilestoneKey[],
        } satisfies RecentActivity)
      : null,
  };

  return NextResponse.json(response);
}
