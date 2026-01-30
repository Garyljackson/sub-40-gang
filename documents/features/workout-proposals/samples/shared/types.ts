// Pace range definitions matching spec
export type PaceRange =
  | 'recovery' // 7:00+/km
  | 'easy' // 6:00-7:00/km
  | 'moderate' // 5:30-6:00/km
  | 'tempo' // 5:00-5:30/km
  | 'threshold' // 4:30-5:00/km
  | 'hard' // 4:00-4:30/km
  | 'sprint'; // <4:00/km

export type RestType = 'standing' | 'walking' | 'active';

// Segment types
export interface WarmupSegment {
  id: string;
  type: 'warmup';
}

export interface CooldownSegment {
  id: string;
  type: 'cooldown';
}

export interface RunSegment {
  id: string;
  type: 'run';
  distanceMeters?: number;
  durationSeconds?: number;
  paceRange?: PaceRange;
}

export interface RestSegment {
  id: string;
  type: 'rest';
  durationSeconds: number;
  restType: RestType;
}

export interface RepeatSegment {
  id: string;
  type: 'repeat';
  count: number;
  segments: Segment[]; // Nested segments (excluding warmup/cooldown)
}

export type Segment = WarmupSegment | RunSegment | RestSegment | CooldownSegment | RepeatSegment;

// Workout definition
export interface Workout {
  id: string;
  name: string;
  wednesdayDate: string; // ISO date string
  notes?: string;
  segments: Segment[];
}

// Proposal with voting
export interface WorkoutProposal {
  id: string;
  workout: Workout;
  proposer: {
    id: string;
    name: string;
    profilePhotoUrl: string | null;
  };
  voteCount: number;
  hasVoted: boolean; // Current user has voted for this
  createdAt: string;
}

// Archive entry (past winner)
export interface ArchivedWorkout {
  id: string;
  workout: Workout;
  proposer: {
    id: string;
    name: string;
    profilePhotoUrl: string | null;
  };
  weekEndingDate: string;
  finalVoteCount: number;
}

// Current user for mock context
export interface CurrentUser {
  id: string;
  name: string;
  profilePhotoUrl: string | null;
  currentVoteProposalId: string | null;
}
