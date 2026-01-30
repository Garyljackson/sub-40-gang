'use client';

import type { Segment } from '@/lib/workout-types';
import { getSegmentColor, getSegmentSummary } from '@/lib/workout-utils';

interface SegmentBlockProps {
  segment: Segment;
  nested?: boolean;
}

export function SegmentBlock({ segment, nested = false }: SegmentBlockProps) {
  const color = getSegmentColor(segment);
  const summary = getSegmentSummary(segment);

  // Size classes based on nesting level
  const sizeClass = nested ? 'min-h-[40px] px-2 py-1' : 'min-h-[56px] px-3 py-2';
  const textSize = nested ? 'text-xs' : 'text-sm';

  if (segment.type === 'repeat') {
    return (
      <div className="flex flex-col rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-2">
        {/* Repeat Header */}
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-700">
            {segment.count}×
          </span>
          <span className="text-xs text-gray-500">repeat</span>
        </div>

        {/* Nested Segments - shown as boxes */}
        <div className="flex flex-wrap gap-1.5">
          {segment.segments.map((nestedSegment) => (
            <SegmentBlock key={nestedSegment.id} segment={nestedSegment} nested={true} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center rounded-lg ${color} ${sizeClass}`}>
      <span className={`font-medium text-gray-700 ${textSize}`}>{summary}</span>
    </div>
  );
}
