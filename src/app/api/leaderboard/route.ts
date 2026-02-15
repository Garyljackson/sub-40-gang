import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import { MILESTONE_KEYS, type MilestoneKey } from '@/lib/milestones';
import { getCurrentSeason } from '@/lib/timezone';
import type { LeaderboardResponse, LeaderboardEntry, LeaderboardMilestone } from '@/lib/types';

// Rank milestones by distance (higher = better)
const MILESTONE_RANK: Record<MilestoneKey, number> = {
  '1km': 1,
  '2km': 2,
  '5km': 3,
  '7.5km': 4,
  '10km': 5,
};

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const season = parseInt(searchParams.get('season') || '') || getCurrentSeason();

  const supabase = createServiceClient();

  // Fetch all members
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id, name, profile_photo_url, joined_at')
    .order('joined_at', { ascending: true });

  if (membersError) {
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }

  // Fetch all achievements for the season
  const { data: achievements, error: achievementsError } = await supabase
    .from('achievements')
    .select('member_id, milestone, time_seconds')
    .eq('season', season);

  if (achievementsError) {
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
  }

  // Group achievements by member
  const memberAchievements = new Map<
    string,
    Map<MilestoneKey, { achieved: boolean; timeSeconds: number }>
  >();

  for (const achievement of achievements || []) {
    if (!memberAchievements.has(achievement.member_id)) {
      memberAchievements.set(achievement.member_id, new Map());
    }
    const milestoneMap = memberAchievements.get(achievement.member_id)!;
    const existing = milestoneMap.get(achievement.milestone);
    if (!existing || achievement.time_seconds < existing.timeSeconds) {
      milestoneMap.set(achievement.milestone, {
        achieved: true,
        timeSeconds: achievement.time_seconds,
      });
    }
  }

  // Build leaderboard entries
  const entries: Omit<LeaderboardEntry, 'rank'>[] = (members || []).map((member) => {
    const achievements = memberAchievements.get(member.id) || new Map();

    const milestones: Partial<Record<MilestoneKey, LeaderboardMilestone>> = {};
    let bestMilestoneRank = 0;
    let bestMilestone: MilestoneKey | null = null;

    for (const key of MILESTONE_KEYS) {
      const achievement = achievements.get(key);
      if (achievement) {
        milestones[key] = achievement;
        const rank = MILESTONE_RANK[key];
        if (rank > bestMilestoneRank) {
          bestMilestoneRank = rank;
          bestMilestone = key;
        }
      }
    }

    return {
      member: {
        id: member.id,
        name: member.name,
        profilePhotoUrl: member.profile_photo_url,
      },
      milestones,
      totalMilestones: achievements.size,
      bestMilestone,
    };
  });

  // Sort by total milestones (desc), then best milestone (desc), then join date (asc)
  entries.sort((a, b) => {
    if (b.totalMilestones !== a.totalMilestones) {
      return b.totalMilestones - a.totalMilestones;
    }
    const aRank = a.bestMilestone ? MILESTONE_RANK[a.bestMilestone] : 0;
    const bRank = b.bestMilestone ? MILESTONE_RANK[b.bestMilestone] : 0;
    return bRank - aRank;
  });

  // Add ranks
  const rankedEntries: LeaderboardEntry[] = entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  const response: LeaderboardResponse = {
    entries: rankedEntries,
    season,
    currentMemberId: session.memberId,
  };

  return NextResponse.json(response);
}
