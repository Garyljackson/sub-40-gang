import Image from 'next/image';

export function StravaAttribution() {
  return (
    <div className="flex justify-center py-6">
      <a
        href="https://www.strava.com"
        target="_blank"
        rel="noopener noreferrer"
        className="opacity-60 transition-opacity hover:opacity-100"
      >
        <Image
          src="/logo-powered-by-strava.svg"
          alt="Powered by Strava"
          width={146}
          height={15}
          className="h-4 w-auto"
        />
      </a>
    </div>
  );
}
