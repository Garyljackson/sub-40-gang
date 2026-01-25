import { MILESTONES, formatTime, type MilestoneKey } from '@/lib/milestones';

interface MilestoneBadgeProps {
  milestone: MilestoneKey;
  achieved?: boolean;
  timeSeconds?: number;
  size?: 'sm' | 'md' | 'lg';
  showTime?: boolean;
}

// Color gradients from shorter to longer distances
const milestoneColors: Record<MilestoneKey, { bg: string; border: string; text: string }> = {
  '1km': {
    bg: 'bg-emerald-900/50',
    border: 'border-emerald-500',
    text: 'text-emerald-400',
  },
  '2km': {
    bg: 'bg-teal-900/50',
    border: 'border-teal-500',
    text: 'text-teal-400',
  },
  '5km': {
    bg: 'bg-blue-900/50',
    border: 'border-blue-500',
    text: 'text-blue-400',
  },
  '7.5km': {
    bg: 'bg-purple-900/50',
    border: 'border-purple-500',
    text: 'text-purple-400',
  },
  '10km': {
    bg: 'bg-amber-900/50',
    border: 'border-amber-500',
    text: 'text-amber-400',
  },
};

const lockedColors = {
  bg: 'bg-gray-800/50',
  border: 'border-gray-600',
  text: 'text-gray-500',
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
};

export function MilestoneBadge({
  milestone,
  achieved = true,
  timeSeconds,
  size = 'md',
  showTime = false,
}: MilestoneBadgeProps) {
  const colors = achieved ? milestoneColors[milestone] : lockedColors;
  const milestoneData = MILESTONES[milestone];

  return (
    <div
      className={`inline-flex flex-col items-center rounded-lg border ${colors.bg} ${colors.border} ${sizeClasses[size]}`}
    >
      <span className={`font-bold ${colors.text}`}>{milestoneData.displayName}</span>
      {showTime && (
        <span className={`text-xs ${achieved ? colors.text : 'text-gray-500'}`}>
          {timeSeconds ? formatTime(timeSeconds) : formatTime(milestoneData.targetTimeSeconds)}
        </span>
      )}
    </div>
  );
}
