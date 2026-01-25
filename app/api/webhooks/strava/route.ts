import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

interface StravaWebhookEvent {
  object_type: 'activity' | 'athlete';
  object_id: number;
  aspect_type: 'create' | 'update' | 'delete';
  owner_id: number;
  subscription_id: number;
  event_time: number;
  updates?: Record<string, unknown>;
}

/**
 * GET handler: Webhook verification
 * Strava sends a GET request to verify the webhook subscription
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const verifyToken = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Validate the verification request
  if (mode === 'subscribe' && verifyToken === process.env.STRAVA_VERIFY_TOKEN) {
    // Return the challenge to confirm subscription
    return NextResponse.json({ 'hub.challenge': challenge });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

/**
 * POST handler: Receive activity events
 * Must respond within 2 seconds, so we just queue the event and return immediately
 */
export async function POST(request: NextRequest) {
  try {
    const event: StravaWebhookEvent = await request.json();

    // Only process activity creation events
    if (event.object_type !== 'activity' || event.aspect_type !== 'create') {
      return NextResponse.json({ received: true });
    }

    const supabase = createServiceClient();

    // Check if the athlete is a registered member
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('strava_athlete_id', String(event.owner_id))
      .single();

    if (!member) {
      // Not a registered member, ignore the event
      return NextResponse.json({ received: true });
    }

    // Queue the event for processing
    // Use upsert with ignoreDuplicates for idempotency (handles Strava retries)
    await supabase.from('webhook_queue').upsert(
      {
        strava_activity_id: String(event.object_id),
        strava_athlete_id: String(event.owner_id),
        event_type: event.aspect_type,
        status: 'pending',
        attempts: 0,
      },
      {
        onConflict: 'strava_activity_id',
        ignoreDuplicates: true,
      }
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to prevent Strava from retrying
    return NextResponse.json({ received: true });
  }
}
