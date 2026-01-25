'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 text-center">
      <div className="mb-6 text-6xl">😵</div>
      <h1 className="mb-2 text-2xl font-bold text-gray-100">Something went wrong</h1>
      <p className="mb-8 max-w-sm text-gray-400">We hit an unexpected error. Please try again.</p>
      <button
        onClick={reset}
        className="bg-brand-primary hover:bg-brand-primary/90 rounded-lg px-6 py-3 font-medium text-white transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
