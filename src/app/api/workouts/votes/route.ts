import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedHandler } from '@/lib/api-auth';
import { createServiceClient } from '@/lib/supabase-server';
import { getCurrentVotingWednesday } from '@/lib/timezone';
import type { VoteRequest } from '@/lib/workout-types';

/**
 * POST /api/workouts/votes
 * Vote for a proposal (auto-swaps if already voted for another)
 */
const postHandler: AuthenticatedHandler = async (request, session) => {
  const body = (await request.json()) as VoteRequest;
  const { proposalId } = body;

  if (!proposalId || typeof proposalId !== 'string') {
    return NextResponse.json({ error: 'proposalId is required' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const wednesdayDate = getCurrentVotingWednesday();

  // Verify the proposal exists and is for the current voting period
  const { data: proposal, error: proposalError } = await supabase
    .from('workout_proposals')
    .select('id, wednesday_date')
    .eq('id', proposalId)
    .single();

  if (proposalError || !proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  if (proposal.wednesday_date !== wednesdayDate) {
    return NextResponse.json(
      { error: 'Cannot vote for proposals from other weeks' },
      { status: 400 }
    );
  }

  // Delete existing vote for this week (if any) - this handles the swap
  await supabase
    .from('workout_votes')
    .delete()
    .eq('member_id', session.memberId)
    .eq('wednesday_date', wednesdayDate);

  // Insert new vote
  const { error: insertError } = await supabase.from('workout_votes').insert({
    proposal_id: proposalId,
    member_id: session.memberId,
    wednesday_date: wednesdayDate,
  });

  if (insertError) {
    console.error('Failed to create vote:', insertError);
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 });
  }

  return NextResponse.json({ success: true, proposalId });
};

/**
 * DELETE /api/workouts/votes
 * Remove current vote
 */
const deleteHandler: AuthenticatedHandler = async (_request, session) => {
  const supabase = createServiceClient();
  const wednesdayDate = getCurrentVotingWednesday();

  // Delete existing vote for this week
  const { error } = await supabase
    .from('workout_votes')
    .delete()
    .eq('member_id', session.memberId)
    .eq('wednesday_date', wednesdayDate);

  if (error) {
    console.error('Failed to delete vote:', error);
    return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
};

export const POST = withAuth(postHandler);
export const DELETE = withAuth(deleteHandler);
