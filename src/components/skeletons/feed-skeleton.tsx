import { Card, CardContent, CardFooter } from '../ui/card';

function AchievementCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-gray-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-800" />
            <div className="h-3 w-20 animate-pulse rounded bg-gray-800" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="h-8 w-24 animate-pulse rounded-full bg-gray-800" />
          <div className="space-y-2 text-right">
            <div className="ml-auto h-7 w-20 animate-pulse rounded bg-gray-800" />
            <div className="ml-auto h-4 w-28 animate-pulse rounded bg-gray-800" />
          </div>
        </div>

        <div className="h-4 w-28 animate-pulse rounded bg-gray-800" />
      </CardContent>

      <CardFooter>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-12 animate-pulse rounded-lg bg-gray-800" />
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
