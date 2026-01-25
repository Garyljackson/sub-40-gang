import { Card, CardContent, CardFooter } from './ui/card';
import { Avatar } from './ui/avatar';
import { ReactionBar } from './reaction-bar';
import { MILESTONES, MILESTONE_EMOJIS, formatTime } from '@/lib/milestones';
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

function formatPace(timeSeconds: number, distanceMeters: number): string {
  const paceSecondsPerKm = timeSeconds / (distanceMeters / 1000);
  const mins = Math.floor(paceSecondsPerKm / 60);
  const secs = Math.floor(paceSecondsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AchievementCard({ achievement, onReactionUpdate }: AchievementCardProps) {
  const milestoneData = MILESTONES[achievement.milestone];
  const emoji = MILESTONE_EMOJIS[achievement.milestone];
  const achievedTime = achievement.timeSeconds;
  const is10km = achievement.milestone === '10km';

  // Calculate actual pace
  const actualPace = formatPace(achievedTime, milestoneData.distanceMeters);

  return (
    <Card className={is10km ? 'celebration-pulse ring-2 ring-amber-300/50' : ''}>
      <CardContent className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Avatar
            src={achievement.member.profilePhotoUrl}
            name={achievement.member.name}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium text-gray-900">{achievement.member.name}</p>
              <span className="text-sm text-gray-400">
                {formatRelativeTime(achievement.achievedAt)}
              </span>
            </div>
            <p className="text-sm text-gray-500">Unlocked a new milestone!</p>
          </div>
        </div>

        {/* Achievement Banner */}
        <div
          className={`rounded-xl p-3 ${
            is10km
              ? 'bg-gradient-to-br from-amber-200/60 via-orange-200/40 to-amber-200/60'
              : 'bg-gradient-to-br from-gray-100 to-slate-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-xl text-3xl ${
                is10km
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg'
                  : 'border border-gray-100 bg-white shadow-sm'
              }`}
            >
              {emoji}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {milestoneData.displayName} @ 4:00/km
              </p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">
                {formatTime(achievedTime)}
              </p>
              <p className="text-xs text-gray-500">{actualPace} /km</p>
            </div>
          </div>

          {/* Special celebration for 10km */}
          {is10km && (
            <div className="mt-2 border-t border-amber-300/30 pt-2 text-center">
              <p className="text-brand-primary text-sm font-semibold">🎉 S40G GOAL ACHIEVED! 🎉</p>
            </div>
          )}
        </div>

        {/* Strava link */}
        <a
          href={`https://www.strava.com/activities/${achievement.stravaActivityId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-primary inline-flex items-center gap-1 text-sm hover:underline"
        >
          <ArrowIcon className="h-4 w-4" />
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

function ArrowIcon({ className }: { className?: string }) {
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
