export function ProfileSkeleton() {
  return (
    <main className="space-y-6 p-4">
      <header className="flex items-center gap-4">
        <div className="h-16 w-16 animate-pulse rounded-full bg-gray-800" />
        <div className="space-y-2">
          <div className="h-7 w-36 animate-pulse rounded bg-gray-800" />
          <div className="h-5 w-48 animate-pulse rounded bg-gray-800" />
        </div>
      </header>

      <section>
        <div className="mb-3 h-6 w-24 animate-pulse rounded bg-gray-800" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-gray-800 bg-gray-900 p-4"
            >
              <div className="mb-2 h-5 w-16 rounded bg-gray-800" />
              <div className="h-4 w-12 rounded bg-gray-800" />
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 h-6 w-32 animate-pulse rounded bg-gray-800" />
        <div className="animate-pulse rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-5 w-32 rounded bg-gray-800" />
            <div className="h-4 w-20 rounded bg-gray-800" />
          </div>
          <div className="flex gap-4">
            <div className="h-4 w-16 rounded bg-gray-800" />
            <div className="h-4 w-16 rounded bg-gray-800" />
            <div className="h-4 w-20 rounded bg-gray-800" />
          </div>
        </div>
      </section>
    </main>
  );
}
