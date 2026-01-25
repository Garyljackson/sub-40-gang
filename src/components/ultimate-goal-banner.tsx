import { MILESTONE_EMOJIS } from '@/lib/milestones';

interface UltimateGoalBannerProps {
  hasAchieved10km: boolean;
}

export function UltimateGoalBanner({ hasAchieved10km }: UltimateGoalBannerProps) {
  const trophyEmoji = MILESTONE_EMOJIS['10km'];

  if (hasAchieved10km) {
    return (
      <div className="rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-2xl">
            {trophyEmoji}
          </div>
          <div>
            <p className="font-bold text-white">Welcome to the S40G!</p>
            <p className="text-sm text-white/80">You&apos;ve achieved the ultimate goal!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-2xl">
          {trophyEmoji}
        </div>
        <div>
          <p className="font-bold text-gray-900">The Ultimate Goal</p>
          <p className="text-sm text-gray-600">Run 10km in under 40:00 to join the S40G!</p>
        </div>
      </div>
    </div>
  );
}
