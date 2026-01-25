import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { BottomNav } from '@/components/bottom-nav';
import { InstallPrompt } from '@/components/install-prompt';
import { StravaAttribution } from '@/components/strava-attribution';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen pb-20">
      {children}
      <StravaAttribution />
      <InstallPrompt />
      <BottomNav />
    </div>
  );
}
