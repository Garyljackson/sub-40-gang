import { LeaderboardSkeleton } from '@/components/skeletons/leaderboard-skeleton';
import { PageHeader } from '@/components/page-header';
import { Logo } from '@/components/logo';

export default function LeaderboardLoading() {
  return (
    <main>
      <PageHeader title="Leaderboard" logo={<Logo size="md" />} />
      <div className="p-4">
        <LeaderboardSkeleton count={8} />
      </div>
    </main>
  );
}
