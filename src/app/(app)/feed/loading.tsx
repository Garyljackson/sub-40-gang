import { FeedSkeleton } from '@/components/skeletons/feed-skeleton';
import { PageHeader } from '@/components/page-header';
import { Logo } from '@/components/logo';

export default function FeedLoading() {
  return (
    <main>
      <PageHeader title="S40G" logo={<Logo size="md" />} />
      <div className="p-4">
        <FeedSkeleton count={4} />
      </div>
    </main>
  );
}
