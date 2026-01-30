import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { getCurrentVotingWednesday } from '@/lib/timezone';

/**
 * GET handler: Archive the winning workout and reset for new week
 * Runs every Wednesday at 6:00 AM Brisbane time
 * Protected by CRON_SECRET in Authorization header
 *
 * Logic:
 * 1. Get the current voting period's Wednesday date
 * 2. Find the proposal with the most votes (earliest if tie)
 * 3. If it has votes, archive it
 * 4. Clear all proposals and votes for this week
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const wednesdayDate = getCurrentVotingWednesday();

  try {
    // Fetch all proposals for this week with their vote counts
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
      throw new Error(`Failed to fetch proposals: ${proposalsError.message}`);
    }

    if (!proposals || proposals.length === 0) {
      return NextResponse.json({
        message: 'No proposals to archive',
        wednesdayDate,
        archived: null,
      });
    }

    // Fetch all votes for this week
    const { data: votes, error: votesError } = await supabase
      .from('workout_votes')
      .select('proposal_id')
      .eq('wednesday_date', wednesdayDate);

    if (votesError) {
      throw new Error(`Failed to fetch votes: ${votesError.message}`);
    }

    // Count votes per proposal
    const voteCounts = new Map<string, number>();
    for (const vote of votes || []) {
      voteCounts.set(vote.proposal_id, (voteCounts.get(vote.proposal_id) || 0) + 1);
    }

    // Find the winning proposal (most votes, earliest if tie)
    let winner = null;
    let maxVotes = 0;

    for (const proposal of proposals) {
      const voteCount = voteCounts.get(proposal.id) || 0;
      if (voteCount > maxVotes) {
        maxVotes = voteCount;
        winner = proposal;
      }
    }

    // Archive the winner if it has votes
    let archivedName: string | null = null;
    if (winner && maxVotes > 0) {
      const proposer = winner.proposer as {
        id: string;
        name: string;
        profile_photo_url: string | null;
      };

      const { error: archiveError } = await supabase.from('archived_workouts').insert({
        name: winner.name,
        notes: winner.notes,
        segments: winner.segments,
        wednesday_date: wednesdayDate,
        proposer_id: proposer.id,
        proposer_name: proposer.name,
        proposer_profile_photo_url: proposer.profile_photo_url,
        final_vote_count: maxVotes,
      });

      if (archiveError) {
        // If unique constraint violation, the week was already archived
        if (archiveError.code === '23505') {
          console.log(`Week ${wednesdayDate} already archived, skipping`);
        } else {
          throw new Error(`Failed to archive workout: ${archiveError.message}`);
        }
      } else {
        archivedName = winner.name;
        console.log(`Archived "${winner.name}" with ${maxVotes} votes for ${wednesdayDate}`);
      }
    } else {
      console.log(`No votes cast for ${wednesdayDate}, no winner to archive`);
    }

    // Clear proposals for this week
    const { error: deleteProposalsError } = await supabase
      .from('workout_proposals')
      .delete()
      .eq('wednesday_date', wednesdayDate);

    if (deleteProposalsError) {
      console.error('Failed to delete proposals:', deleteProposalsError);
    }

    // Clear votes for this week (should cascade, but be explicit)
    const { error: deleteVotesError } = await supabase
      .from('workout_votes')
      .delete()
      .eq('wednesday_date', wednesdayDate);

    if (deleteVotesError) {
      console.error('Failed to delete votes:', deleteVotesError);
    }

    return NextResponse.json({
      message: archivedName ? 'Workout archived successfully' : 'No winner to archive (no votes)',
      wednesdayDate,
      archived: archivedName,
      votes: maxVotes,
      proposalsCleared: proposals.length,
    });
  } catch (error) {
    console.error('Archive workout error:', error);
    return NextResponse.json(
      {
        error: 'Archive failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
