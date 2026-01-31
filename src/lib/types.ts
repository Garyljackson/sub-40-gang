import type { MilestoneKey } from './milestones';

// Allowed reaction emojis
export const ALLOWED_EMOJIS = ['🎉', '👏', '🔥', '💪', '🍺', '🍆'] as const;
export type AllowedEmoji = (typeof ALLOWED_EMOJIS)[number];

// Feed API types
export interface FeedMember {
  id: string;
  name: string;
  profilePhotoUrl: string | null;
}

export interface FeedReaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export interface FeedAchievement {
  id: string;
  milestone: MilestoneKey;
  timeSeconds: number;
  achievedAt: string;
  stravaActivityId: string;
  member: FeedMember;
  reactions: FeedReaction[];
}

export interface FeedResponse {
  achievements: FeedAchievement[];
  nextCursor: string | null;
  hasMore: boolean;
}

// Leaderboard API types
export interface LeaderboardMilestone {
  achieved: boolean;
  timeSeconds?: number;
}

export interface LeaderboardEntry {
  rank: number;
  member: FeedMember;
  milestones: Partial<Record<MilestoneKey, LeaderboardMilestone>>;
  totalMilestones: number;
  bestMilestone: MilestoneKey | null;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  season: number;
  currentMemberId: string;
}

// Profile API types
export interface ProfileMilestone {
  milestone: MilestoneKey;
  displayName: string;
  targetTimeSeconds: number;
  achievement?: {
    id: string;
    timeSeconds: number;
    achievedAt: string;
    stravaActivityId: string;
  };
}

export interface ProfileResponse {
  member: {
    id: string;
    name: string;
    profilePhotoUrl: string | null;
    joinedAt: string;
  };
  season: number;
  milestones: ProfileMilestone[];
  totalAchieved: number;
}

// Recent Activity API types
export interface RecentActivity {
  id: string;
  name: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  paceSecondsPerKm: number;
  activityDate: string;
  stravaActivityId: string;
  milestonesUnlocked: MilestoneKey[];
}

export interface RecentActivityResponse {
  activity: RecentActivity | null;
}

// Reactions API types
export interface ReactionRequest {
  achievementId: string;
  emoji: AllowedEmoji;
}

export interface ReactionResponse {
  success: boolean;
  reactions: FeedReaction[];
}
