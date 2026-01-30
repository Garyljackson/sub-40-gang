import { ProfileSkeleton } from '@/components/skeletons/profile-skeleton';
import { PageHeader } from '@/components/page-header';
import { Logo } from '@/components/logo';

export default function ProfileLoading() {
  return (
    <main>
      <PageHeader title="Profile" logo={<Logo size="md" />} />
      <div className="p-4">
        <ProfileSkeleton />
      </div>
    </main>
  );
}
