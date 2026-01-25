import { FeedSkeleton } from '@/components/skeletons/feed-skeleton';

export default function FeedLoading() {
  return (
    <main className="p-4">
      <header className="mb-4">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-800" />
      </header>
      <FeedSkeleton count={4} />
    </main>
  );
}
