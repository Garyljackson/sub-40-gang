import { WorkoutsSkeleton } from '@/components/skeletons/workouts-skeleton';
import { PageHeader } from '@/components/page-header';

export default function WorkoutsLoading() {
  return (
    <main>
      <PageHeader title="Workouts" subtitle="Loading..." />
      <div className="flex gap-2 border-b border-gray-200 bg-white px-4">
        <div className="border-b-2 border-orange-500 px-4 py-3">
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="px-4 py-3">
          <div className="h-4 w-12 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
      <div className="p-4">
        <WorkoutsSkeleton count={3} />
      </div>
    </main>
  );
}
