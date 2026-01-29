import { Card, CardContent, CardHeader } from './ui/card';
import { MilestoneBadge } from './milestone-badge';
import { formatTime } from '@/lib/milestones';
import { BRISBANE_TIMEZONE } from '@/lib/timezone';
import type { RecentActivity } from '@/lib/types';

interface RecentRunCardProps {
  activity: RecentActivity;
}

function formatDistance(meters: number): string {
  const km = meters / 1000;
  return `${km.toFixed(1)}km`;
}

function formatPace(secondsPerKm: number): string {
  return `${formatTime(secondsPerKm)}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    timeZone: BRISBANE_TIMEZONE,
  });
}

export function RecentRunCard({ activity }: RecentRunCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StravaIcon className="text-strava h-5 w-5" />
            <span className="text-sm font-medium text-gray-600">Last synced run</span>
          </div>
          <span className="text-sm text-gray-500">{formatDate(activity.activityDate)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <h3 className="font-semibold text-gray-900">{activity.name}</h3>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500">Distance</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">
              {formatDistance(activity.distanceMeters)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pace</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">
              {formatPace(activity.paceSecondsPerKm)}{' '}
              <span className="text-sm font-normal">/km</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Time</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">
              {formatTime(activity.movingTimeSeconds)}
            </p>
          </div>
        </div>

        {activity.milestonesUnlocked.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <p className="mb-2 text-xs text-gray-500">Milestones Unlocked</p>
            <div className="flex flex-wrap gap-2">
              {activity.milestonesUnlocked.map((milestone) => (
                <MilestoneBadge key={milestone} milestone={milestone} size="sm" showLabel={false} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StravaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}
