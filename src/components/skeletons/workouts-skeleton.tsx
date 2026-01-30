function ProposalCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 p-4">
        {/* Title */}
        <div className="space-y-2">
          <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
        </div>

        {/* Timeline */}
        <div className="flex gap-2">
          <div className="h-14 w-16 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-14 w-24 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-14 w-20 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-14 w-16 animate-pulse rounded-lg bg-gray-200" />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 p-4">
        <div className="h-5 w-16 animate-pulse rounded bg-gray-200" />
        <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}

export function WorkoutsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {/* Propose button skeleton */}
      <div className="h-12 w-full animate-pulse rounded-xl bg-gray-200" />

      {/* Proposal cards */}
      {Array.from({ length: count }).map((_, i) => (
        <ProposalCardSkeleton key={i} />
      ))}
    </div>
  );
}
