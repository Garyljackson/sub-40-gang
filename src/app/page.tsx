import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { StravaLoginButton } from '@/components/strava-login-button';
import { MILESTONE_EMOJIS, type MilestoneKey } from '@/lib/milestones';
import { Logo } from '@/components/logo';

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect('/feed');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white p-6">
      <div className="flex max-w-sm flex-col items-center space-y-8 text-center">
        <div className="flex flex-col items-center space-y-2">
          <Logo size="xl" />
          <p className="text-xl text-gray-600">Sub 40 Gang</p>
        </div>

        <p className="text-gray-500">
          Track your running milestones and compete with your crew to run 10km in under 40 minutes.
        </p>

        <div className="space-y-4">
          <StravaLoginButton />
          <p className="text-xs text-gray-400">
            Connect your Strava account to automatically sync your runs.
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-3 pt-4">
          <MilestonePreview milestone="1km" />
          <MilestonePreview milestone="2km" />
          <MilestonePreview milestone="5km" />
          <MilestonePreview milestone="7.5km" />
          <MilestonePreview milestone="10km" />
        </div>
      </div>
    </main>
  );
}

function MilestonePreview({ milestone }: { milestone: MilestoneKey }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl">
      <span className="opacity-50 grayscale">{MILESTONE_EMOJIS[milestone]}</span>
    </div>
  );
}
