import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import type { FeedAchievement, FeedReaction } from '@/lib/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServiceClient();

  // Fetch achievement with member data
  const { data: achievement, error: achievementError } = await supabase
    .from('achievements')
    .select(
      `
      id,
      milestone,
      time_seconds,
      previous_time_seconds,
      achieved_at,
      strava_activity_id,
      member:members!inner (
        id,
        name,
        profile_photo_url
      )
    `
    )
    .eq('id', id)
    .single();

  if (achievementError || !achievement) {
    return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
  }

  // Fetch reactions for this achievement
  const { data: reactions } = await supabase
    .from('reactions')
    .select('emoji, member_id')
    .eq('achievement_id', id);

  // Aggregate reactions
  const emojiMap = new Map<string, { count: number; hasReacted: boolean }>();

  for (const reaction of reactions || []) {
    if (!emojiMap.has(reaction.emoji)) {
      emojiMap.set(reaction.emoji, { count: 0, hasReacted: false });
    }
    const entry = emojiMap.get(reaction.emoji)!;
    entry.count++;
    if (reaction.member_id === session.memberId) {
      entry.hasReacted = true;
    }
  }

  const feedReactions: FeedReaction[] = Array.from(emojiMap.entries()).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    hasReacted: data.hasReacted,
  }));

  const member = achievement.member as unknown as {
    id: string;
    name: string;
    profile_photo_url: string | null;
  };

  const feedAchievement: FeedAchievement = {
    id: achievement.id,
    milestone: achievement.milestone,
    timeSeconds: achievement.time_seconds,
    ...(achievement.previous_time_seconds != null && {
      previousTimeSeconds: achievement.previous_time_seconds,
    }),
    achievedAt: achievement.achieved_at,
    stravaActivityId: achievement.strava_activity_id,
    member: {
      id: member.id,
      name: member.name,
      profilePhotoUrl: member.profile_photo_url,
    },
    reactions: feedReactions,
  };

  return NextResponse.json({ achievement: feedAchievement });
}
