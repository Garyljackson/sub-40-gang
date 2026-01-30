'use client';

import type { WorkoutProposalResponse } from '@/lib/workout-types';
import {
  calculateWorkoutDuration,
  formatTotalDuration,
  formatRelativeTime,
} from '@/lib/workout-utils';
import { WorkoutTimeline } from './workout-timeline';
import { Avatar } from './avatar';

interface ProposalCardProps {
  proposal: WorkoutProposalResponse;
  onVote: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isVoting?: boolean;
}

export function ProposalCard({
  proposal,
  onVote,
  onEdit,
  onDelete,
  isVoting = false,
}: ProposalCardProps) {
  const duration = calculateWorkoutDuration(proposal.segments);

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={proposal.proposer.name} src={proposal.proposer.profilePhotoUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium text-gray-900">{proposal.proposer.name}</p>
              <span className="text-sm text-gray-400">
                {formatRelativeTime(proposal.createdAt)}
              </span>
            </div>
            <p className="text-sm text-gray-500">proposed a workout</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 p-4">
        {/* Workout Title */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{proposal.name}</h3>
          <p className="text-sm text-gray-500">{formatTotalDuration(duration)}</p>
        </div>

        {/* Timeline */}
        <WorkoutTimeline segments={proposal.segments} />

        {/* Notes */}
        {proposal.notes && <p className="text-sm text-gray-600">{proposal.notes}</p>}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">👍</span>
          <span className="font-medium text-gray-700">
            {proposal.voteCount} {proposal.voteCount === 1 ? 'vote' : 'votes'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {proposal.isOwn && (
            <>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="rounded-lg px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-50"
                >
                  Delete
                </button>
              )}
            </>
          )}
          <button
            onClick={onVote}
            disabled={isVoting}
            className={`min-w-[100px] rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-50 ${
              proposal.hasVoted
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {proposal.hasVoted ? 'Voted ✓' : 'Vote'}
          </button>
        </div>
      </div>
    </div>
  );
}
