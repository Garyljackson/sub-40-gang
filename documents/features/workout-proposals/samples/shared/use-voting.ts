'use client';

import { useState, useCallback } from 'react';
import type { WorkoutProposal, CurrentUser } from './types';

interface UseVotingProps {
  initialProposals: WorkoutProposal[];
  currentUser: CurrentUser;
}

export function useVoting({ initialProposals, currentUser }: UseVotingProps) {
  const [proposals, setProposals] = useState(initialProposals);
  const [currentVoteId, setCurrentVoteId] = useState<string | null>(
    currentUser.currentVoteProposalId
  );

  const vote = useCallback(
    (proposalId: string) => {
      setProposals((prev) => {
        return prev.map((p) => {
          if (p.id === currentVoteId) {
            // Remove vote from previous
            return { ...p, voteCount: p.voteCount - 1, hasVoted: false };
          }
          if (p.id === proposalId) {
            // Add vote to new
            return { ...p, voteCount: p.voteCount + 1, hasVoted: true };
          }
          return p;
        });
      });
      setCurrentVoteId(proposalId);
    },
    [currentVoteId]
  );

  const unvote = useCallback((proposalId: string) => {
    setProposals((prev) => {
      return prev.map((p) => {
        if (p.id === proposalId) {
          return { ...p, voteCount: p.voteCount - 1, hasVoted: false };
        }
        return p;
      });
    });
    setCurrentVoteId(null);
  }, []);

  // Sort by vote count (desc), then by creation time (asc)
  const sortedProposals = [...proposals].sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return {
    proposals: sortedProposals,
    currentVoteId,
    vote,
    unvote,
    hasVoted: currentVoteId !== null,
  };
}
