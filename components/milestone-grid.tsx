import { MilestoneBadge } from './milestone-badge';
import { formatTime } from '@/lib/milestones';
import type { ProfileMilestone } from '@/lib/types';

interface MilestoneGridProps {
  milestones: ProfileMilestone[];
}

export function MilestoneGrid({ milestones }: MilestoneGridProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {milestones.map((milestone) => (
        <div key={milestone.milestone} className="flex flex-col items-center gap-1">
          <MilestoneBadge
            milestone={milestone.milestone}
            achieved={!!milestone.achievement}
            timeSeconds={milestone.achievement?.timeSeconds}
            size="md"
            showTime={false}
          />
          <div className="text-center">
            {milestone.achievement ? (
              <span className="text-xs font-medium text-gray-300">
                {formatTime(milestone.achievement.timeSeconds)}
              </span>
            ) : (
              <span className="text-xs text-gray-500">
                {formatTime(milestone.targetTimeSeconds)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
