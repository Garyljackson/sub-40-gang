import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedHandler } from '@/lib/api-auth';
import { createServiceClient } from '@/lib/supabase-server';
import { getCurrentVotingWednesday, formatWednesdayDate } from '@/lib/timezone';
import { validateSegments } from '@/lib/workout-utils';
import { WORKOUT_NAME_MAX_LENGTH, WORKOUT_NOTES_MAX_LENGTH } from '@/lib/workout-constants';
import type {
  ProposalsResponse,
  WorkoutProposalResponse,
  CreateProposalRequest,
  Segment,
} from '@/lib/workout-types';
import type { Json } from '@/lib/database.types';

/**
 * GET /api/workouts/proposals
 * Get all proposals for the current voting period
 */
const getHandler: AuthenticatedHandler<ProposalsResponse> = async (_request, session) => {
  const supabase = createServiceClient();
  const wednesdayDate = getCurrentVotingWednesday();

  // Fetch proposals with proposer info
  const { data: proposals, error: proposalsError } = await supabase
    .from('workout_proposals')
    .select(
      `
      id,
      name,
      notes,
      segments,
      wednesday_date,
      proposer_id,
      created_at,
      proposer:members!inner(id, name, profile_photo_url)
    `
    )
    .eq('wednesday_date', wednesdayDate)
    .order('created_at', { ascending: true });

  if (proposalsError) {
    console.error('Failed to fetch proposals:', proposalsError);
    return NextResponse.json(
      { error: 'Failed to fetch proposals' } as unknown as ProposalsResponse,
      { status: 500 }
    );
  }

  // Fetch all votes for this week
  const { data: votes, error: votesError } = await supabase
    .from('workout_votes')
    .select('proposal_id, member_id')
    .eq('wednesday_date', wednesdayDate);

  if (votesError) {
    console.error('Failed to fetch votes:', votesError);
    return NextResponse.json({ error: 'Failed to fetch votes' } as unknown as ProposalsResponse, {
      status: 500,
    });
  }

  // Find current user's vote
  const currentVote = votes?.find((v) => v.member_id === session.memberId);

  // Count votes per proposal
  const voteCounts = new Map<string, number>();
  for (const vote of votes || []) {
    voteCounts.set(vote.proposal_id, (voteCounts.get(vote.proposal_id) || 0) + 1);
  }

  // Transform proposals to response format
  const proposalResponses: WorkoutProposalResponse[] = (proposals || []).map((p) => {
    const proposer = p.proposer as { id: string; name: string; profile_photo_url: string | null };
    return {
      id: p.id,
      name: p.name,
      notes: p.notes,
      segments: p.segments as unknown as Segment[],
      wednesdayDate: p.wednesday_date,
      proposer: {
        id: proposer.id,
        name: proposer.name,
        profilePhotoUrl: proposer.profile_photo_url,
      },
      voteCount: voteCounts.get(p.id) || 0,
      hasVoted: currentVote?.proposal_id === p.id,
      isOwn: p.proposer_id === session.memberId,
      createdAt: p.created_at,
    };
  });

  // Sort by vote count (desc), then by created_at (asc)
  proposalResponses.sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return NextResponse.json({
    proposals: proposalResponses,
    votingPeriod: {
      wednesdayDate,
      displayDate: formatWednesdayDate(wednesdayDate),
    },
    currentVoteId: currentVote?.proposal_id || null,
  });
};

/**
 * POST /api/workouts/proposals
 * Create a new proposal
 */
const postHandler: AuthenticatedHandler = async (request, session) => {
  const body = (await request.json()) as CreateProposalRequest;
  const { name, notes, segments } = body;

  // Validate name
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Workout name is required' }, { status: 400 });
  }

  if (name.length > WORKOUT_NAME_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Workout name must be ${WORKOUT_NAME_MAX_LENGTH} characters or less` },
      { status: 400 }
    );
  }

  // Validate notes
  if (notes && notes.length > WORKOUT_NOTES_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Notes must be ${WORKOUT_NOTES_MAX_LENGTH} characters or less` },
      { status: 400 }
    );
  }

  // Validate segments
  if (!segments || !Array.isArray(segments)) {
    return NextResponse.json(
      { error: 'Segments are required and must be an array' },
      { status: 400 }
    );
  }

  const segmentValidation = validateSegments(segments);
  if (!segmentValidation.valid) {
    return NextResponse.json({ error: segmentValidation.error }, { status: 400 });
  }

  const supabase = createServiceClient();
  const wednesdayDate = getCurrentVotingWednesday();

  // Insert proposal
  const { data: proposal, error } = await supabase
    .from('workout_proposals')
    .insert({
      name: name.trim(),
      notes: notes?.trim() || null,
      segments: segments as unknown as Json,
      wednesday_date: wednesdayDate,
      proposer_id: session.memberId,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create proposal:', error);
    return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 });
  }

  return NextResponse.json(proposal, { status: 201 });
};

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
