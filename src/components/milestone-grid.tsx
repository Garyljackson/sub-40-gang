import { Card, CardContent, CardHeader } from './ui/card';
import { MilestoneBadge } from './milestone-badge';
import type { ProfileMilestone } from '@/lib/types';

interface MilestoneGridProps {
  milestones: ProfileMilestone[];
  hasAchieved10km?: boolean;
}

export function MilestoneGrid({ milestones, hasAchieved10km = false }: MilestoneGridProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-gray-900">Your Milestones</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          {milestones.map((milestone) => (
            <MilestoneBadge
              key={milestone.milestone}
              milestone={milestone.milestone}
              achieved={!!milestone.achievement}
              timeSeconds={milestone.achievement?.timeSeconds}
              size="sm"
              showTime
              showLabel
            />
          ))}
        </div>

        {/* Ultimate Goal Callout - shown when 10km not achieved */}
        {!hasAchieved10km && (
          <div className="border-t border-gray-100 pt-4">
            <div className="from-brand-primary/5 flex items-center gap-3 rounded-xl bg-gradient-to-r to-amber-400/5 p-3">
              <span className="text-3xl">🏆</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">The Ultimate Goal</p>
                <p className="text-xs text-gray-500">Run 10km in under 40:00 min</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
