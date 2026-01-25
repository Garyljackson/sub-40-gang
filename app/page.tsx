import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { StravaLoginButton } from '@/components/strava-login-button';

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect('/feed');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-brand-primary text-4xl font-bold tracking-tight">S40G</h1>
          <p className="text-xl text-gray-300">Sub 40 Gang</p>
        </div>

        <p className="text-gray-400">
          Track your running milestones and compete with your crew to run 10km in under 40 minutes.
        </p>

        <div className="space-y-4">
          <StravaLoginButton />
          <p className="text-xs text-gray-500">
            Connect your Strava account to automatically sync your runs.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-5 gap-2 pt-4">
          <MilestonePreview label="1km" />
          <MilestonePreview label="2km" />
          <MilestonePreview label="5km" />
          <MilestonePreview label="7.5km" />
          <MilestonePreview label="10km" />
        </div>
      </div>
    </main>
  );
}

function MilestonePreview({ label }: { label: string }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-700 bg-gray-800/50 text-xs font-medium text-gray-400">
      {label}
    </div>
  );
}
