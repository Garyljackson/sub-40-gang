import Link from 'next/link';
import Image from 'next/image';

export function StravaLoginButton() {
  return (
    <Link href="/api/auth/strava" className="inline-block">
      <Image
        src="/btn-strava-connect.svg"
        alt="Connect with Strava"
        width={237}
        height={48}
        priority
      />
    </Link>
  );
}
