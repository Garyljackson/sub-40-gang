import { Card, CardContent } from '../ui/card';

function LeaderboardRowSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Rank badge */}
          <div className="h-8 w-8 animate-pulse rounded bg-gray-200" />

          {/* Avatar */}
          <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />

          {/* Name and stats */}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
          </div>
        </div>

        {/* Milestone row */}
        <div className="mt-3 flex items-center justify-between">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center">
              <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
              {i < 5 && <div className="mx-1 h-0.5 w-2 bg-gray-200" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function LeaderboardSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <LeaderboardRowSkeleton key={i} />
      ))}
    </div>
  );
}
