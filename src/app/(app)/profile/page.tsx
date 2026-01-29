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
