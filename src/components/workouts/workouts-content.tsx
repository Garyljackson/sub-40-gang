'use client';

import { useState, useCallback, useTransition } from 'react';
import type {
  ProposalsResponse,
  WorkoutProposalResponse,
  ArchivedWorkoutResponse,
  Segment,
} from '@/lib/workout-types';
import { ProposalCard } from './proposal-card';
import { ArchiveCard } from './archive-card';
import { WorkoutBuilder } from './workout-builder';

interface WorkoutsContentProps {
  initialData: ProposalsResponse;
}

export function WorkoutsContent({ initialData }: WorkoutsContentProps) {
  const [activeTab, setActiveTab] = useState<'proposals' | 'history'>('proposals');
  const [proposals, setProposals] = useState<WorkoutProposalResponse[]>(initialData.proposals);
  const [currentVoteId, setCurrentVoteId] = useState<string | null>(initialData.currentVoteId);
  const [archives, setArchives] = useState<ArchivedWorkoutResponse[]>([]);
  const [archivesLoaded, setArchivesLoaded] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingProposal, setEditingProposal] = useState<WorkoutProposalResponse | null>(null);
  const [_isPending, startTransition] = useTransition();
  const [isVoting, setIsVoting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch archives when tab is selected
  const loadArchives = useCallback(async () => {
    if (archivesLoaded) return;

    try {
      const res = await fetch('/api/workouts/archive');
      if (!res.ok) throw new Error('Failed to fetch archives');
      const data = await res.json();
      setArchives(data.archives);
      setArchivesLoaded(true);
    } catch (error) {
      console.error('Failed to load archives:', error);
    }
  }, [archivesLoaded]);

  // Handle tab change
  const handleTabChange = (tab: 'proposals' | 'history') => {
    setActiveTab(tab);
    if (tab === 'history' && !archivesLoaded) {
      loadArchives();
    }
  };

  // Handle vote
  const handleVote = async (proposalId: string) => {
    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal) return;

    setIsVoting(true);

    // If clicking on already-voted proposal, unvote
    if (proposal.hasVoted) {
      // Optimistic update
      setProposals((prev) =>
        prev.map((p) =>
          p.id === proposalId ? { ...p, hasVoted: false, voteCount: p.voteCount - 1 } : p
        )
      );
      setCurrentVoteId(null);

      try {
        const res = await fetch('/api/workouts/votes', { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to unvote');
      } catch (error) {
        console.error('Failed to unvote:', error);
        // Revert optimistic update
        refreshProposals();
      }
    } else {
      // Voting for a new proposal
      const previousVoteId = currentVoteId;

      // Optimistic update
      setProposals((prev) =>
        prev.map((p) => {
          if (p.id === proposalId) {
            return { ...p, hasVoted: true, voteCount: p.voteCount + 1 };
          }
          if (p.id === previousVoteId) {
            return { ...p, hasVoted: false, voteCount: p.voteCount - 1 };
          }
          return p;
        })
      );
      setCurrentVoteId(proposalId);

      try {
        const res = await fetch('/api/workouts/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposalId }),
        });
        if (!res.ok) throw new Error('Failed to vote');
      } catch (error) {
        console.error('Failed to vote:', error);
        // Revert optimistic update
        refreshProposals();
      }
    }

    setIsVoting(false);
  };

  // Refresh proposals from server
  const refreshProposals = async () => {
    try {
      const res = await fetch('/api/workouts/proposals');
      if (!res.ok) throw new Error('Failed to fetch proposals');
      const data: ProposalsResponse = await res.json();
      setProposals(data.proposals);
      setCurrentVoteId(data.currentVoteId);
    } catch (error) {
      console.error('Failed to refresh proposals:', error);
    }
  };

  // Handle create proposal
  const handleCreateProposal = async (data: {
    name: string;
    notes?: string;
    segments: Segment[];
  }) => {
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/workouts/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create proposal');
      }

      setShowBuilder(false);
      startTransition(() => {
        refreshProposals();
      });
    } catch (error) {
      console.error('Failed to create proposal:', error);
      alert(error instanceof Error ? error.message : 'Failed to create proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update proposal
  const handleUpdateProposal = async (data: {
    name: string;
    notes?: string;
    segments: Segment[];
  }) => {
    if (!editingProposal) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/workouts/proposals/${editingProposal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update proposal');
      }

      setEditingProposal(null);
      startTransition(() => {
        refreshProposals();
      });
    } catch (error) {
      console.error('Failed to update proposal:', error);
      alert(error instanceof Error ? error.message : 'Failed to update proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete proposal
  const handleDeleteProposal = async (proposalId: string) => {
    if (!confirm('Are you sure you want to delete this proposal?')) return;

    try {
      const res = await fetch(`/api/workouts/proposals/${proposalId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete proposal');

      // Remove from local state
      setProposals((prev) => prev.filter((p) => p.id !== proposalId));
    } catch (error) {
      console.error('Failed to delete proposal:', error);
      alert('Failed to delete proposal');
    }
  };

  // Handle clone from archive
  const handleCloneWorkout = (archive: ArchivedWorkoutResponse) => {
    setEditingProposal({
      id: '', // New proposal
      name: archive.name,
      notes: archive.notes,
      segments: archive.segments,
      wednesdayDate: initialData.votingPeriod.wednesdayDate,
      proposer: archive.proposer,
      voteCount: 0,
      hasVoted: false,
      isOwn: true,
      createdAt: new Date().toISOString(),
    });
    setShowBuilder(true);
    setActiveTab('proposals');
  };

  // Sort proposals by vote count, then by creation time
  const sortedProposals = [...proposals].sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <>
      {/* Tab Toggle */}
      <div className="flex gap-2 border-b border-gray-200 bg-white px-4">
        <button
          onClick={() => handleTabChange('proposals')}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'proposals'
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => handleTabChange('history')}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          History
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'proposals' ? (
          <div className="space-y-4">
            {/* Propose Button */}
            <button
              onClick={() => {
                setEditingProposal(null);
                setShowBuilder(true);
              }}
              className="w-full rounded-xl bg-orange-500 py-3 font-medium text-white shadow-sm transition-colors hover:bg-orange-600"
            >
              + Propose a Workout
            </button>

            {sortedProposals.length === 0 ? (
              <div className="rounded-xl bg-white py-12 text-center shadow-sm">
                <p className="text-gray-500">No proposals yet this week.</p>
                <p className="mt-2 text-sm text-gray-400">Be the first to propose a workout!</p>
              </div>
            ) : (
              sortedProposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onVote={() => handleVote(proposal.id)}
                  onEdit={proposal.isOwn ? () => setEditingProposal(proposal) : undefined}
                  onDelete={proposal.isOwn ? () => handleDeleteProposal(proposal.id) : undefined}
                  isVoting={isVoting}
                />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {!archivesLoaded ? (
              <div className="rounded-xl bg-white py-12 text-center shadow-sm">
                <p className="text-gray-500">Loading history...</p>
              </div>
            ) : archives.length === 0 ? (
              <div className="rounded-xl bg-white py-12 text-center shadow-sm">
                <p className="text-gray-500">No past workouts yet.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500">Past winning workouts</p>
                {archives.map((archive) => (
                  <ArchiveCard
                    key={archive.id}
                    archive={archive}
                    onClone={() => handleCloneWorkout(archive)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Workout Builder Modal */}
      {(showBuilder || editingProposal) && (
        <WorkoutBuilder
          onClose={() => {
            setShowBuilder(false);
            setEditingProposal(null);
          }}
          onSubmit={editingProposal?.id ? handleUpdateProposal : handleCreateProposal}
          isSubmitting={isSubmitting}
          initialData={
            editingProposal
              ? {
                  name: editingProposal.name,
                  notes: editingProposal.notes || undefined,
                  segments: editingProposal.segments,
                }
              : undefined
          }
        />
      )}
    </>
  );
}
