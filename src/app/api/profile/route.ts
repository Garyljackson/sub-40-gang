import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import { MILESTONES, MILESTONE_KEYS } from '@/lib/milestones';
import { getCurrentSeason } from '@/lib/timezone';
import type { ProfileResponse, ProfileMilestone } from '@/lib/types';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const season = parseInt(searchParams.get('season') || '') || getCurrentSeason();

  const supabase = createServiceClient();

  // Fetch member info
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id, name, profile_photo_url, joined_at')
    .eq('id', session.memberId)
    .single();

  if (memberError || !member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // Fetch achievements for this member this season
  const { data: achievements, error: achievementsError } = await supabase
    .from('achievements')
    .select('id, milestone, time_seconds, achieved_at, strava_activity_id')
    .eq('member_id', session.memberId)
    .eq('season', season);

  if (achievementsError) {
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
  }

  // Build map keeping only the best (lowest) time per milestone
  type AchievementRow = NonNullable<typeof achievements>[number];
  const achievementMap = new Map<string, AchievementRow>();
  for (const a of achievements ?? []) {
    const existing = achievementMap.get(a.milestone);
    if (!existing || a.time_seconds < existing.time_seconds) {
      achievementMap.set(a.milestone, a);
    }
  }

  const milestones: ProfileMilestone[] = MILESTONE_KEYS.map((key) => {
    const milestoneData = MILESTONES[key];
    const achievement = achievementMap.get(key);

    return {
      milestone: key,
      displayName: milestoneData.displayName,
      targetTimeSeconds: milestoneData.targetTimeSeconds,
      achievement: achievement
        ? {
            id: achievement.id,
            timeSeconds: achievement.time_seconds,
            achievedAt: achievement.achieved_at,
            stravaActivityId: achievement.strava_activity_id,
          }
        : undefined,
    };
  });

  const response: ProfileResponse = {
    member: {
      id: member.id,
      name: member.name,
      profilePhotoUrl: member.profile_photo_url,
      joinedAt: member.joined_at,
    },
    season,
    milestones,
    totalAchieved: achievementMap.size,
  };

  return NextResponse.json(response);
}
