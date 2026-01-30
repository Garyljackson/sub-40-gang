import { Card, CardContent, CardHeader } from '../ui/card';

export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      {/* User Info */}
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 animate-pulse rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-12 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-36 animate-pulse rounded bg-gray-200" />
        </div>
      </div>

      {/* Milestones Card */}
      <Card>
        <CardHeader>
          <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
                <div className="h-3 w-8 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-10 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Last Synced Run */}
      <Card>
        <CardHeader>
          <div className="h-5 w-28 animate-pulse rounded bg-gray-200" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="flex gap-4">
              <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logout Button */}
      <section className="pt-4">
        <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200" />
      </section>
    </div>
  );
}
