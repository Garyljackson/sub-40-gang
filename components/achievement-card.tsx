import { Card, CardContent, CardFooter } from './ui/card';
import { Avatar } from './ui/avatar';
import { MilestoneBadge } from './milestone-badge';
import { ReactionBar } from './reaction-bar';
import { MILESTONES, formatTime } from '@/lib/milestones';
import type { FeedAchievement, FeedReaction } from '@/lib/types';

interface AchievementCardProps {
  achievement: FeedAchievement;
  onReactionUpdate?: (achievementId: string, reactions: FeedReaction[]) => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
  });
}

export function AchievementCard({ achievement, onReactionUpdate }: AchievementCardProps) {
  const milestoneData = MILESTONES[achievement.milestone];
  const targetTime = milestoneData.targetTimeSeconds;
  const achievedTime = achievement.timeSeconds;
  const timeDiff = targetTime - achievedTime;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar
            src={achievement.member.profilePhotoUrl}
            name={achievement.member.name}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-gray-100">{achievement.member.name}</p>
            <p className="text-sm text-gray-400">{formatRelativeTime(achievement.achievedAt)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <MilestoneBadge milestone={achievement.milestone} size="lg" showTime />

          <div className="text-right">
            <p className="text-brand-primary text-2xl font-bold">{formatTime(achievedTime)}</p>
            {timeDiff > 0 && (
              <p className="text-sm text-gray-400">{formatTime(timeDiff)} under target</p>
            )}
          </div>
        </div>

        <a
          href={`https://www.strava.com/activities/${achievement.stravaActivityId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-primary inline-flex items-center gap-1 text-sm hover:underline"
        >
          <RunIcon className="h-4 w-4" />
          View on Strava
        </a>
      </CardContent>

      <CardFooter>
        <ReactionBar
          achievementId={achievement.id}
          reactions={achievement.reactions}
          onUpdate={(reactions) => onReactionUpdate?.(achievement.id, reactions)}
        />
      </CardFooter>
    </Card>
  );
}

function RunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}
