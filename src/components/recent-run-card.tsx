import { Card, CardContent } from './ui/card';
import { MilestoneBadge } from './milestone-badge';
import { formatTime } from '@/lib/milestones';
import type { RecentActivity } from '@/lib/types';

interface RecentRunCardProps {
  activity: RecentActivity;
}

function formatDistance(meters: number): string {
  const km = meters / 1000;
  return `${km.toFixed(2)} km`;
}

function formatPace(secondsPerKm: number): string {
  return `${formatTime(secondsPerKm)} /km`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function RecentRunCard({ activity }: RecentRunCardProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium text-gray-100">{activity.name}</h3>
            <p className="text-sm text-gray-400">{formatDate(activity.activityDate)}</p>
          </div>
          <a
            href={`https://www.strava.com/activities/${activity.stravaActivityId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-primary text-sm hover:underline"
          >
            View on Strava
          </a>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-semibold text-gray-100">
              {formatDistance(activity.distanceMeters)}
            </p>
            <p className="text-xs text-gray-400">Distance</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-100">
              {formatTime(activity.movingTimeSeconds)}
            </p>
            <p className="text-xs text-gray-400">Time</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-100">
              {formatPace(activity.paceSecondsPerKm)}
            </p>
            <p className="text-xs text-gray-400">Pace</p>
          </div>
        </div>

        {activity.milestonesUnlocked.length > 0 && (
          <div className="border-t border-gray-800 pt-4">
            <p className="mb-2 text-xs text-gray-400">Milestones Unlocked</p>
            <div className="flex flex-wrap gap-2">
              {activity.milestonesUnlocked.map((milestone) => (
                <MilestoneBadge key={milestone} milestone={milestone} size="sm" />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
