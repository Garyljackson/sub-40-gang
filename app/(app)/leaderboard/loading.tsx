import { LeaderboardSkeleton } from '@/components/skeletons/leaderboard-skeleton';

export default function LeaderboardLoading() {
  return (
    <main className="p-4">
      <header className="mb-4">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-800" />
        <div className="mt-1 h-5 w-24 animate-pulse rounded bg-gray-800" />
      </header>
      <LeaderboardSkeleton count={8} />
    </main>
  );
}
