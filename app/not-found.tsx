import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 text-center">
      <div className="mb-6 text-6xl">🏃</div>
      <h1 className="mb-2 text-2xl font-bold text-gray-100">Page not found</h1>
      <p className="mb-8 max-w-sm text-gray-400">
        Looks like this page ran off course. Let&apos;s get you back on track.
      </p>
      <Link
        href="/feed"
        className="bg-brand-primary hover:bg-brand-primary/90 rounded-lg px-6 py-3 font-medium text-white transition-colors"
      >
        Back to Feed
      </Link>
    </div>
  );
}
