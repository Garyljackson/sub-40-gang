'use client';

import type { ArchivedWorkoutResponse } from '@/lib/workout-types';
import { formatArchiveWeekDate } from '@/lib/timezone';
import { WorkoutTimeline } from './workout-timeline';

interface ArchiveCardProps {
  archive: ArchivedWorkoutResponse;
  onClone?: () => void;
}

export function ArchiveCard({ archive, onClone }: ArchiveCardProps) {
  const weekDate = formatArchiveWeekDate(archive.wednesdayDate);

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Week of {weekDate}</p>
            <h3 className="font-semibold text-gray-900">{archive.name}</h3>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">by {archive.proposer.name}</p>
            <p className="text-sm text-gray-400">{archive.finalVoteCount} votes</p>
          </div>
        </div>

        <WorkoutTimeline segments={archive.segments} />

        {onClone && (
          <button
            onClick={onClone}
            className="mt-4 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Propose Again
          </button>
        )}
      </div>
    </div>
  );
}
