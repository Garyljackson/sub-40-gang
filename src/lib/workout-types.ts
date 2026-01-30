// Workout Proposals Feature Types
// Matches database enums and JSONB structure

// Pace range enum (matches database)
export type PaceRange =
  | 'recovery' // 7:00+/km
  | 'easy' // 6:00-7:00/km
  | 'moderate' // 5:30-6:00/km
  | 'tempo' // 5:00-5:30/km
  | 'threshold' // 4:30-5:00/km
  | 'hard' // 4:00-4:30/km
  | 'sprint'; // <4:00/km

// Rest type enum (matches database)
export type RestType = 'standing' | 'walking' | 'active';

// Segment types (stored as JSONB in database)
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

// API Response Types

export interface ProposerInfo {
  id: string;
  name: string;
  profilePhotoUrl: string | null;
}

export interface WorkoutProposalResponse {
  id: string;
  name: string;
  notes: string | null;
  segments: Segment[];
  wednesdayDate: string;
  proposer: ProposerInfo;
  voteCount: number;
  hasVoted: boolean;
  isOwn: boolean;
  createdAt: string;
}

export interface VotingPeriod {
  wednesdayDate: string;
  displayDate: string;
}

export interface ProposalsResponse {
  proposals: WorkoutProposalResponse[];
  votingPeriod: VotingPeriod;
  currentVoteId: string | null;
}

export interface ArchivedWorkoutResponse {
  id: string;
  name: string;
  notes: string | null;
  segments: Segment[];
  wednesdayDate: string;
  proposer: ProposerInfo;
  finalVoteCount: number;
}

export interface ArchiveResponse {
  archives: ArchivedWorkoutResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}

// API Request Types

export interface CreateProposalRequest {
  name: string;
  notes?: string;
  segments: Segment[];
}

export interface UpdateProposalRequest {
  name?: string;
  notes?: string;
  segments?: Segment[];
}

export interface VoteRequest {
  proposalId: string;
}

// Workout type (used in builder before submitting)
export interface Workout {
  id: string;
  name: string;
  wednesdayDate: string;
  notes?: string;
  segments: Segment[];
}

// Current user context for UI
export interface CurrentUser {
  id: string;
  name: string;
  profilePhotoUrl: string | null;
  currentVoteProposalId: string | null;
}
