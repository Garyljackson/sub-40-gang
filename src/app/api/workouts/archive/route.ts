import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedHandler } from '@/lib/api-auth';
import { createServiceClient } from '@/lib/supabase-server';
import type { ArchiveResponse, ArchivedWorkoutResponse, Segment } from '@/lib/workout-types';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/**
 * GET /api/workouts/archive
 * Get archived (past winning) workouts with pagination
 */
const getHandler: AuthenticatedHandler<ArchiveResponse> = async (request) => {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const limit = Math.min(parseInt(searchParams.get('limit') || '') || DEFAULT_LIMIT, MAX_LIMIT);

  const supabase = createServiceClient();

  // Build query
  let query = supabase
    .from('archived_workouts')
    .select('*')
    .order('wednesday_date', { ascending: false })
    .limit(limit + 1); // Fetch one extra to check for more

  // Apply cursor (pagination by wednesday_date)
  if (cursor) {
    query = query.lt('wednesday_date', cursor);
  }

  const { data: archives, error } = await query;

  if (error) {
    console.error('Failed to fetch archives:', error);
    return NextResponse.json({ error: 'Failed to fetch archives' } as unknown as ArchiveResponse, {
      status: 500,
    });
  }

  // Check if there are more results
  const hasMore = (archives?.length || 0) > limit;
  const results = hasMore ? archives!.slice(0, -1) : archives || [];

  // Get next cursor (wednesday_date of last item)
  const nextCursor =
    hasMore && results.length > 0 ? results[results.length - 1]!.wednesday_date : null;

  // Transform to response format
  const archiveResponses: ArchivedWorkoutResponse[] = results.map((a) => ({
    id: a.id,
    name: a.name,
    notes: a.notes,
    segments: a.segments as unknown as Segment[],
    wednesdayDate: a.wednesday_date,
    proposer: {
      id: a.proposer_id || '',
      name: a.proposer_name,
      profilePhotoUrl: a.proposer_profile_photo_url,
    },
    finalVoteCount: a.final_vote_count,
  }));

  return NextResponse.json({
    archives: archiveResponses,
    nextCursor,
    hasMore,
  });
};

export const GET = withAuth(getHandler);
