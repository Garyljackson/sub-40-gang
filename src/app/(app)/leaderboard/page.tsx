import { getSession } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import { MILESTONE_KEYS, type MilestoneKey } from '@/lib/milestones';
import { getCurrentSeason } from '@/lib/timezone';
import { LeaderboardList } from '@/components/leaderboard-list';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/page-header';
import { Logo } from '@/components/logo';
import type { LeaderboardEntry, LeaderboardMilestone } from '@/lib/types';

const MILESTONE_RANK: Record<MilestoneKey, number> = {
  '1km': 1,
  '2km': 2,
  '5km': 3,
  '7.5km': 4,
  '10km': 5,
};

async function getLeaderboardData(currentMemberId: string) {
  const supabase = createServiceClient();
  const season = getCurrentSeason();

  const [membersResult, achievementsResult] = await Promise.all([
    supabase
      .from('members')
      .select('id, name, profile_photo_url, joined_at')
      .order('joined_at', { ascending: true }),
    supabase.from('achievements').select('member_id, milestone, time_seconds').eq('season', season),
  ]);

  if (membersResult.error) {
    throw new Error('Failed to fetch members');
  }

  // Group achievements by member
  const memberAchievements = new Map<
    string,
    Map<MilestoneKey, { achieved: boolean; timeSeconds: number }>
  >();

  for (const achievement of achievementsResult.data || []) {
    if (!memberAchievements.has(achievement.member_id)) {
      memberAchievements.set(achievement.member_id, new Map());
    }
    memberAchievements.get(achievement.member_id)!.set(achievement.milestone, {
      achieved: true,
      timeSeconds: achievement.time_seconds,
    });
  }

  // Build entries
  const entries: Omit<LeaderboardEntry, 'rank'>[] = (membersResult.data || []).map((member) => {
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

  // Sort
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

  return {
    entries: rankedEntries,
    season,
    currentMemberId,
  };
}

export default async function LeaderboardPage() {
  const session = await getSession();
  if (!session) {
    return null; // Layout handles redirect
  }

  const data = await getLeaderboardData(session.memberId);

  return (
    <main>
      <PageHeader title="Leaderboard" logo={<Logo size="md" />} />
      <div className="p-4">
        {data.entries.length > 0 ? (
          <LeaderboardList entries={data.entries} currentMemberId={data.currentMemberId} />
        ) : (
          <EmptyState
            message="No members yet"
            description="Be the first to join and start tracking milestones!"
          />
        )}
      </div>
    </main>
  );
}
