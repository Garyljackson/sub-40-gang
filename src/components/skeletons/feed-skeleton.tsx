import { Card, CardContent, CardFooter } from '../ui/card';

function AchievementCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3">
        {/* Header - avatar + name/subtitle */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-12 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="h-3 w-36 animate-pulse rounded bg-gray-200" />
          </div>
        </div>

        {/* Achievement Banner - gradient background with emoji box + text */}
        <div className="animate-pulse rounded-xl bg-gradient-to-br from-gray-100 to-slate-100 p-3">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl border border-gray-100 bg-white shadow-sm" />
            <div className="space-y-2">
              <div className="h-4 w-28 rounded bg-gray-200" />
              <div className="h-6 w-16 rounded bg-gray-200" />
              <div className="h-3 w-14 rounded bg-gray-200" />
            </div>
          </div>
        </div>

        {/* Strava link placeholder */}
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
      </CardContent>

      <CardFooter>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-12 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <AchievementCardSkeleton key={i} />
      ))}
    </div>
  );
}
