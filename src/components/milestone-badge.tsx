import { MILESTONES, MILESTONE_EMOJIS, formatTime, type MilestoneKey } from '@/lib/milestones';

interface MilestoneBadgeProps {
  milestone: MilestoneKey;
  achieved?: boolean;
  timeSeconds?: number;
  size?: 'sm' | 'md' | 'lg';
  showTime?: boolean;
  showLabel?: boolean;
}

const sizeClasses = {
  sm: 'h-10 w-10 text-lg',
  md: 'h-14 w-14 text-2xl',
  lg: 'h-20 w-20 text-4xl',
};

const labelSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

function formatTargetTime(milestone: MilestoneKey): string {
  const data = MILESTONES[milestone];
  return `under ${formatTime(data.targetTimeSeconds)}`;
}

export function MilestoneBadge({
  milestone,
  achieved = true,
  timeSeconds,
  size = 'md',
  showTime = false,
  showLabel = true,
}: MilestoneBadgeProps) {
  const milestoneData = MILESTONES[milestone];
  const emoji = MILESTONE_EMOJIS[milestone];

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex items-center justify-center rounded-full transition-all duration-300 ${sizeClasses[size]} ${
          achieved ? 'bg-gradient-to-br from-amber-200/40 to-amber-100/20' : 'bg-gray-100'
        }`}
      >
        <span className={achieved ? '' : 'opacity-40 grayscale'}>{emoji}</span>
      </div>
      {showLabel && (
        <span
          className={`font-medium ${labelSizeClasses[size]} ${
            achieved ? 'text-gray-900' : 'text-gray-400'
          }`}
        >
          {milestoneData.displayName}
        </span>
      )}
      {showTime && (
        <span
          className={`text-center text-xs ${achieved ? 'text-brand-primary font-semibold' : 'text-gray-400'}`}
        >
          {achieved && timeSeconds ? formatTime(timeSeconds) : formatTargetTime(milestone)}
        </span>
      )}
    </div>
  );
}
