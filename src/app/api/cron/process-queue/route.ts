import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import {
  getValidToken,
  fetchActivity,
  fetchActivityStreams,
  StravaRateLimitError,
} from '@/lib/strava';
import { processActivity } from '@/lib/process-activity';

const MAX_ITEMS_PER_RUN = 10;

/**
 * GET handler: Process queued webhook events
 * Protected by CRON_SECRET in Authorization header
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  let processed = 0;
  let failed = 0;

  try {
    // Fetch pending queue items, ordered by created_at
    const { data: queueItems, error: fetchError } = await supabase
      .from('webhook_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(MAX_ITEMS_PER_RUN);

    if (fetchError) {
      throw new Error(`Failed to fetch queue items: ${fetchError.message}`);
    }

    if (!queueItems || queueItems.length === 0) {
      return NextResponse.json({ processed: 0, failed: 0, message: 'No items to process' });
    }

    for (const item of queueItems) {
      try {
        // Update status to processing and increment attempts
        await supabase
          .from('webhook_queue')
          .update({
            status: 'processing',
            attempts: item.attempts + 1,
          })
          .eq('id', item.id);

        // Look up member by strava_athlete_id
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id, joined_at')
          .eq('strava_athlete_id', item.strava_athlete_id)
          .single();

        if (memberError || !member) {
          throw new Error(`Member not found for athlete ${item.strava_athlete_id}`);
        }

        // Get valid token (refresh if needed)
        const accessToken = await getValidToken(member.id);

        // Fetch activity details
        const activity = await fetchActivity(item.strava_activity_id, accessToken);

        // Skip if not a Run
        if (activity.type !== 'Run' && activity.sport_type !== 'Run') {
          await supabase
            .from('webhook_queue')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString(),
              error_message: 'Skipped: not a run activity',
            })
            .eq('id', item.id);
          processed++;
          continue;
        }

        // Skip if activity date < member joined_at
        const activityDate = new Date(activity.start_date);
        const joinedAt = new Date(member.joined_at);
        if (activityDate < joinedAt) {
          await supabase
            .from('webhook_queue')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString(),
              error_message: 'Skipped: activity before join date',
            })
            .eq('id', item.id);
          processed++;
          continue;
        }

        // Fetch activity streams
        const streams = await fetchActivityStreams(item.strava_activity_id, accessToken);

        // Process activity and calculate achievements
        const result = await processActivity(member.id, activity, streams);

        // Update status to completed
        await supabase
          .from('webhook_queue')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
            error_message:
              result.newAchievements.length > 0 || result.newImprovements.length > 0
                ? [
                    result.newAchievements.length > 0
                      ? `Unlocked: ${result.newAchievements.map((a) => a.milestone).join(', ')}`
                      : null,
                    result.newImprovements.length > 0
                      ? `Improved: ${result.newImprovements.map((i) => i.milestone).join(', ')}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join('; ')
                : null,
          })
          .eq('id', item.id);

        processed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Handle rate limit specially - don't count against attempts
        if (error instanceof StravaRateLimitError) {
          await supabase
            .from('webhook_queue')
            .update({
              status: 'pending', // Keep as pending for retry
              error_message: `Rate limited: ${errorMessage}`,
              // Don't increment attempts for rate limits
              attempts: item.attempts,
            })
            .eq('id', item.id);
        } else if (item.attempts + 1 >= item.max_attempts) {
          // Max attempts reached, mark as failed
          await supabase
            .from('webhook_queue')
            .update({
              status: 'failed',
              error_message: errorMessage,
            })
            .eq('id', item.id);
          failed++;
        } else {
          // Retry later
          await supabase
            .from('webhook_queue')
            .update({
              status: 'pending',
              error_message: errorMessage,
            })
            .eq('id', item.id);
          failed++;
        }

        console.error(`Failed to process queue item ${item.id}:`, errorMessage);
      }
    }

    return NextResponse.json({ processed, failed });
  } catch (error) {
    console.error('Queue processing error:', error);
    return NextResponse.json(
      {
        error: 'Queue processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
