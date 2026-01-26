import { getSession } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import { MILESTONES, MILESTONE_KEYS } from '@/lib/milestones';
import { getCurrentSeason } from '@/lib/timezone';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { MilestoneGrid } from '@/components/milestone-grid';
import { RecentRunCard } from '@/components/recent-run-card';
import { LogoutButton } from '@/components/logout-button';
import { PageHeader } from '@/components/page-header';
import { Logo } from '@/components/logo';
import type { ProfileMilestone, RecentActivity } from '@/lib/types';
import type { MilestoneKey } from '@/lib/milestones';

async function getProfileData(memberId: string) {
  const supabase = createServiceClient();
  const season = getCurrentSeason();

  const [memberResult, achievementsResult] = await Promise.all([
    supabase
      .from('members')
      .select('id, name, profile_photo_url, joined_at')
      .eq('id', memberId)
      .single(),
    supabase
      .from('achievements')
      .select('id, milestone, time_seconds, achieved_at, strava_activity_id')
      .eq('member_id', memberId)
      .eq('season', season),
  ]);

  if (memberResult.error || !memberResult.data) {
    throw new Error('Failed to fetch member');
  }

  const achievementMap = new Map(achievementsResult.data?.map((a) => [a.milestone, a]) || []);

  const milestones: ProfileMilestone[] = MILESTONE_KEYS.map((key) => {
    const milestoneData = MILESTONES[key];
    const achievement = achievementMap.get(key);

    return {
      milestone: key,
      displayName: milestoneData.displayName,
      targetTimeSeconds: milestoneData.targetTimeSeconds,
      achievement: achievement
        ? {
            id: achievement.id,
            timeSeconds: achievement.time_seconds,
            achievedAt: achievement.achieved_at,
            stravaActivityId: achievement.strava_activity_id,
          }
        : undefined,
    };
  });

  return {
    member: memberResult.data,
    milestones,
    totalAchieved: achievementsResult.data?.length || 0,
    hasAchieved10km: achievementMap.has('10km'),
    season,
  };
}

async function getRecentActivity(memberId: string): Promise<RecentActivity | null> {
  const supabase = createServiceClient();

  const { data: activity, error } = await supabase
    .from('processed_activities')
    .select('*')
    .eq('member_id', memberId)
    .order('activity_date', { ascending: false })
    .limit(1)
    .single();

  if (error || !activity) {
    return null;
  }

  return {
    id: activity.id,
    name: activity.activity_name,
    distanceMeters: activity.distance_meters,
    movingTimeSeconds: activity.moving_time_seconds,
    paceSecondsPerKm: activity.pace_seconds_per_km,
    activityDate: activity.activity_date,
    stravaActivityId: activity.strava_activity_id,
    milestonesUnlocked: (activity.milestones_unlocked || []) as MilestoneKey[],
  };
}

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    return null; // Layout handles redirect
  }

  const [profileData, recentActivity] = await Promise.all([
    getProfileData(session.memberId),
    getRecentActivity(session.memberId),
  ]);

  return (
    <main>
      <PageHeader title="Profile" logo={<Logo size="md" />} />
      <div className="space-y-4 p-4">
        {/* User Info */}
        <div className="flex items-center gap-4">
          <Avatar
            src={profileData.member.profile_photo_url}
            name={profileData.member.name}
            size="xl"
          />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">You</h2>
            <p className="text-sm text-gray-500">
              {profileData.totalAchieved}/5 milestones unlocked
            </p>
          </div>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Settings"
          >
            <SettingsIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Milestones Card with Ultimate Goal inside */}
        <MilestoneGrid
          milestones={profileData.milestones}
          hasAchieved10km={profileData.hasAchieved10km}
        />

        {/* Last Synced Run */}
        <section>
          {recentActivity ? (
            <RecentRunCard activity={recentActivity} />
          ) : (
            <EmptyState
              message="No activities synced yet"
              description="Your runs will appear here after syncing from Strava"
            />
          )}
        </section>

        {/* Logout */}
        <section className="pt-4">
          <LogoutButton />
        </section>
      </div>
    </main>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
