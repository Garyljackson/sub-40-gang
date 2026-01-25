import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import { getCurrentSeason } from '@/lib/timezone';
import type { FeedResponse, FeedAchievement, FeedReaction } from '@/lib/types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const limit = Math.min(parseInt(searchParams.get('limit') || '') || DEFAULT_LIMIT, MAX_LIMIT);
  const season = parseInt(searchParams.get('season') || '') || getCurrentSeason();

  const supabase = createServiceClient();

  // Build query for achievements with member data
  let query = supabase
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
    .limit(limit);

  if (cursor) {
    query = query.lt('achieved_at', cursor);
  }

  const { data: achievements, error: achievementsError } = await query;

  if (achievementsError) {
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
  }

  if (!achievements || achievements.length === 0) {
    const response: FeedResponse = {
      achievements: [],
      nextCursor: null,
      hasMore: false,
    };
    return NextResponse.json(response);
  }

  // Fetch reactions for these achievements
  const achievementIds = achievements.map((a) => a.id);
  const { data: reactions, error: reactionsError } = await supabase
    .from('reactions')
    .select('achievement_id, emoji, member_id')
    .in('achievement_id', achievementIds);

  if (reactionsError) {
    return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 });
  }

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
    if (reaction.member_id === session.memberId) {
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

  const hasMore = achievements.length === limit;
  const lastAchievement = achievements[achievements.length - 1];
  const nextCursor = hasMore && lastAchievement ? lastAchievement.achieved_at : null;

  const response: FeedResponse = {
    achievements: feedAchievements,
    nextCursor,
    hasMore,
  };

  return NextResponse.json(response);
}
