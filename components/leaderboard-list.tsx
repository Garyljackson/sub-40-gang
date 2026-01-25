import { Avatar } from './ui/avatar';
import { MILESTONE_KEYS } from '@/lib/milestones';
import type { LeaderboardEntry } from '@/lib/types';

interface LeaderboardListProps {
  entries: LeaderboardEntry[];
  currentMemberId: string;
}

export function LeaderboardList({ entries, currentMemberId }: LeaderboardListProps) {
  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <LeaderboardRow
          key={entry.member.id}
          entry={entry}
          isCurrentUser={entry.member.id === currentMemberId}
        />
      ))}
    </div>
  );
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}

function LeaderboardRow({ entry, isCurrentUser }: LeaderboardRowProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 ${
        isCurrentUser
          ? 'border-brand-primary/50 bg-brand-primary/10'
          : 'border-gray-800 bg-gray-900'
      }`}
    >
      <div className="flex h-8 w-8 items-center justify-center text-lg font-bold text-gray-400">
        {entry.rank}
      </div>

      <Avatar src={entry.member.profilePhotoUrl} name={entry.member.name} size="sm" />

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-100">{entry.member.name}</p>
        <p className="text-xs text-gray-400">{entry.totalMilestones} milestones</p>
      </div>

      <div className="flex gap-1">
        {MILESTONE_KEYS.map((key) => {
          const achieved = !!entry.milestones[key];
          return (
            <div
              key={key}
              className={`h-2 w-2 rounded-full ${achieved ? getMilestoneColor(key) : 'bg-gray-700'}`}
              title={key}
            />
          );
        })}
      </div>
    </div>
  );
}

function getMilestoneColor(milestone: string): string {
  switch (milestone) {
    case '1km':
      return 'bg-emerald-500';
    case '2km':
      return 'bg-teal-500';
    case '5km':
      return 'bg-blue-500';
    case '7.5km':
      return 'bg-purple-500';
    case '10km':
      return 'bg-amber-500';
    default:
      return 'bg-gray-500';
  }
}
