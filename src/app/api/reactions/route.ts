import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import {
  ALLOWED_EMOJIS,
  type ReactionResponse,
  type FeedReaction,
  type AllowedEmoji,
} from '@/lib/types';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { achievementId, emoji } = body;

  if (!achievementId || !emoji) {
    return NextResponse.json({ error: 'Missing achievementId or emoji' }, { status: 400 });
  }

  if (!ALLOWED_EMOJIS.includes(emoji as AllowedEmoji)) {
    return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Add reaction (will fail silently if already exists due to unique constraint)
  const { error: insertError } = await supabase.from('reactions').upsert(
    {
      achievement_id: achievementId,
      member_id: session.memberId,
      emoji,
    },
    {
      onConflict: 'achievement_id,member_id',
    }
  );

  if (insertError) {
    return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
  }

  // Fetch updated reactions
  const reactions = await getReactionsForAchievement(supabase, achievementId, session.memberId);

  const response: ReactionResponse = {
    success: true,
    reactions,
  };

  return NextResponse.json(response);
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { achievementId, emoji } = body;

  if (!achievementId || !emoji) {
    return NextResponse.json({ error: 'Missing achievementId or emoji' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Remove reaction
  const { error: deleteError } = await supabase
    .from('reactions')
    .delete()
    .eq('achievement_id', achievementId)
    .eq('member_id', session.memberId)
    .eq('emoji', emoji);

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 });
  }

  // Fetch updated reactions
  const reactions = await getReactionsForAchievement(supabase, achievementId, session.memberId);

  const response: ReactionResponse = {
    success: true,
    reactions,
  };

  return NextResponse.json(response);
}

async function getReactionsForAchievement(
  supabase: ReturnType<typeof createServiceClient>,
  achievementId: string,
  currentMemberId: string
): Promise<FeedReaction[]> {
  const { data: reactions } = await supabase
    .from('reactions')
    .select('emoji, member_id')
    .eq('achievement_id', achievementId);

  if (!reactions) {
    return [];
  }

  const emojiMap = new Map<string, { count: number; hasReacted: boolean }>();

  for (const reaction of reactions) {
    if (!emojiMap.has(reaction.emoji)) {
      emojiMap.set(reaction.emoji, { count: 0, hasReacted: false });
    }
    const entry = emojiMap.get(reaction.emoji)!;
    entry.count++;
    if (reaction.member_id === currentMemberId) {
      entry.hasReacted = true;
    }
  }

  return Array.from(emojiMap.entries()).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    hasReacted: data.hasReacted,
  }));
}
