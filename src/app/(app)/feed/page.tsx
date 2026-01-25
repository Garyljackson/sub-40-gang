import { getSession } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import { getCurrentSeason } from '@/lib/timezone';
import { FeedList } from '@/components/feed-list';
import type { FeedResponse, FeedAchievement, FeedReaction } from '@/lib/types';

const INITIAL_LIMIT = 20;

async function getInitialFeed(currentMemberId: string): Promise<FeedResponse> {
  const supabase = createServiceClient();
  const season = getCurrentSeason();

  // Fetch achievements with member data
  const { data: achievements, error: achievementsError } = await supabase
    .from('achievements')
    .select(
      `
      id,
      milestone,
      time_seconds,
      achieved_at,
      strava_activity_id,
      member:members!inner (
        id,
        name,
        profile_photo_url
      )
    `
    )
    .eq('season', season)
    .order('achieved_at', { ascending: false })
    .limit(INITIAL_LIMIT);

  if (achievementsError || !achievements || achievements.length === 0) {
    return {
      achievements: [],
      nextCursor: null,
      hasMore: false,
    };
  }

  // Fetch reactions
  const achievementIds = achievements.map((a) => a.id);
  const { data: reactions } = await supabase
    .from('reactions')
    .select('achievement_id, emoji, member_id')
    .in('achievement_id', achievementIds);

  // Aggregate reactions per achievement
  const reactionsByAchievement = new Map<
    string,
    Map<string, { count: number; hasReacted: boolean }>
  >();

  for (const reaction of reactions || []) {
    if (!reactionsByAchievement.has(reaction.achievement_id)) {
      reactionsByAchievement.set(reaction.achievement_id, new Map());
    }
    const emojiMap = reactionsByAchievement.get(reaction.achievement_id)!;
    if (!emojiMap.has(reaction.emoji)) {
      emojiMap.set(reaction.emoji, { count: 0, hasReacted: false });
    }
    const entry = emojiMap.get(reaction.emoji)!;
    entry.count++;
    if (reaction.member_id === currentMemberId) {
      entry.hasReacted = true;
    }
  }

  // Build response
  const feedAchievements: FeedAchievement[] = achievements.map((achievement) => {
    const member = achievement.member as unknown as {
      id: string;
      name: string;
      profile_photo_url: string | null;
    };

    const emojiMap = reactionsByAchievement.get(achievement.id) || new Map();
    const feedReactions: FeedReaction[] = Array.from(emojiMap.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      hasReacted: data.hasReacted,
    }));

    return {
      id: achievement.id,
      milestone: achievement.milestone,
      timeSeconds: achievement.time_seconds,
      achievedAt: achievement.achieved_at,
      stravaActivityId: achievement.strava_activity_id,
      member: {
        id: member.id,
        name: member.name,
        profilePhotoUrl: member.profile_photo_url,
      },
      reactions: feedReactions,
    };
  });

  const hasMore = achievements.length === INITIAL_LIMIT;
  const lastAchievement = achievements[achievements.length - 1];
  const nextCursor = hasMore && lastAchievement ? lastAchievement.achieved_at : null;

  return {
    achievements: feedAchievements,
    nextCursor,
    hasMore,
  };
}

export default async function FeedPage() {
  const session = await getSession();
  if (!session) {
    return null; // Layout handles redirect
  }

  const initialData = await getInitialFeed(session.memberId);

  return (
    <main className="p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-gray-100">Activity Feed</h1>
        <p className="text-gray-400">Season {getCurrentSeason()}</p>
      </header>

      <FeedList
        initialData={initialData}
        currentMemberId={session.memberId}
        season={getCurrentSeason()}
      />
    </main>
  );
}
