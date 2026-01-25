import { Card, CardContent } from './ui/card';
import { Avatar } from './ui/avatar';
import { RankBadge } from './rank-badge';
import { MILESTONE_KEYS, MILESTONE_EMOJIS } from '@/lib/milestones';
import type { LeaderboardEntry } from '@/lib/types';

interface LeaderboardListProps {
  entries: LeaderboardEntry[];
  currentMemberId: string;
}

export function LeaderboardList({ entries, currentMemberId }: LeaderboardListProps) {
  return (
    <div className="space-y-3">
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
  const isLeader = entry.rank === 1;

  const getBorderClass = () => {
    if (isCurrentUser) return 'ring-2 ring-brand-primary/50';
    if (isLeader) return 'ring-2 ring-amber-300/60';
    return '';
  };

  return (
    <Card className={`transition-shadow hover:shadow-md ${getBorderClass()}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <RankBadge rank={entry.rank} />

          <Avatar src={entry.member.profilePhotoUrl} name={entry.member.name} size="md" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium text-gray-900">{entry.member.name}</p>
              {isCurrentUser && (
                <span className="bg-brand-primary/10 text-brand-primary rounded-full px-2 py-0.5 text-xs font-medium">
                  You
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{entry.totalMilestones}/5 milestones</p>
          </div>
        </div>

        {/* Milestone row */}
        <div className="mt-3 flex items-center justify-between">
          {MILESTONE_KEYS.map((key, index) => {
            const achieved = !!entry.milestones[key];
            return (
              <div key={key} className="flex items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                    achieved ? 'bg-gradient-to-br from-amber-200/40 to-amber-100/20' : 'bg-gray-100'
                  }`}
                >
                  <span className={achieved ? '' : 'opacity-30 grayscale'}>
                    {MILESTONE_EMOJIS[key]}
                  </span>
                </div>
                {index < MILESTONE_KEYS.length - 1 && (
                  <div className="mx-1 h-0.5 w-2 bg-gray-200" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
