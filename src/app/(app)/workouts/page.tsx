import { getSession } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import { getCurrentVotingWednesday, formatWednesdayDate } from '@/lib/timezone';
import { WorkoutsContent } from '@/components/workouts';
import { PageHeader } from '@/components/page-header';
import type { ProposalsResponse, WorkoutProposalResponse, Segment } from '@/lib/workout-types';

async function getInitialProposals(currentMemberId: string): Promise<ProposalsResponse> {
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
    return {
      proposals: [],
      votingPeriod: {
        wednesdayDate,
        displayDate: formatWednesdayDate(wednesdayDate),
      },
      currentVoteId: null,
    };
  }

  // Fetch all votes for this week
  const { data: votes, error: votesError } = await supabase
    .from('workout_votes')
    .select('proposal_id, member_id')
    .eq('wednesday_date', wednesdayDate);

  if (votesError) {
    console.error('Failed to fetch votes:', votesError);
  }

  // Find current user's vote
  const currentVote = votes?.find((v) => v.member_id === currentMemberId);

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
      isOwn: p.proposer_id === currentMemberId,
      createdAt: p.created_at,
    };
  });

  // Sort by vote count (desc), then by created_at (asc)
  proposalResponses.sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return {
    proposals: proposalResponses,
    votingPeriod: {
      wednesdayDate,
      displayDate: formatWednesdayDate(wednesdayDate),
    },
    currentVoteId: currentVote?.proposal_id || null,
  };
}

export default async function WorkoutsPage() {
  const session = await getSession();
  if (!session) {
    return null; // Layout handles redirect
  }

  const initialData = await getInitialProposals(session.memberId);

  return (
    <main>
      <PageHeader title="Workouts" subtitle={initialData.votingPeriod.displayDate} />
      <WorkoutsContent initialData={initialData} />
    </main>
  );
}
