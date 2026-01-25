import Link from 'next/link';

export function StravaLoginButton() {
  return (
    <Link
      href="/api/auth/strava"
      className="inline-flex h-12 items-center gap-3 rounded-lg bg-[#FC4C02] px-6 font-medium text-white transition-colors hover:bg-[#E34402] active:bg-[#D03D02]"
    >
      <StravaIcon className="h-6 w-6" />
      Sign in with Strava
    </Link>
  );
}

function StravaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}
