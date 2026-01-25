function LeaderboardRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 p-3">
      <div className="h-8 w-8 animate-pulse rounded bg-gray-800" />
      <div className="h-8 w-8 animate-pulse rounded-full bg-gray-800" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-28 animate-pulse rounded bg-gray-800" />
        <div className="h-3 w-20 animate-pulse rounded bg-gray-800" />
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-2 w-2 animate-pulse rounded-full bg-gray-800" />
        ))}
      </div>
    </div>
  );
}

export function LeaderboardSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <LeaderboardRowSkeleton key={i} />
      ))}
    </div>
  );
}
