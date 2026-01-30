'use client';

import type { Segment } from '@/lib/workout-types';
import { SegmentBlock } from './segment-block';

interface WorkoutTimelineProps {
  segments: Segment[];
}

export function WorkoutTimeline({ segments }: WorkoutTimelineProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {segments.map((segment) => (
        <SegmentBlock key={segment.id} segment={segment} />
      ))}
    </div>
  );
}
