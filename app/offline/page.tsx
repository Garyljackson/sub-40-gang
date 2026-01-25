'use client';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 text-center">
      <div className="mb-6 text-6xl">📡</div>
      <h1 className="mb-2 text-2xl font-bold text-gray-100">You&apos;re offline</h1>
      <p className="mb-8 max-w-sm text-gray-400">
        Check your internet connection and try again to see your running milestones.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-brand-primary hover:bg-brand-primary/90 rounded-lg px-6 py-3 font-medium text-white transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
