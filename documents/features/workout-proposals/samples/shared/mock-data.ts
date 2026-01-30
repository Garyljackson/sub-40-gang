import type { WorkoutProposal, ArchivedWorkout, CurrentUser, Segment } from './types';

// Helper to generate unique IDs
let idCounter = 1;
const genId = () => `seg-${idCounter++}`;

// Sample workout segments - 5x800m Intervals
const intervalWorkout: Segment[] = [
  { id: genId(), type: 'warmup' },
  {
    id: genId(),
    type: 'repeat',
    count: 5,
    segments: [
      { id: genId(), type: 'run', distanceMeters: 800, paceRange: 'hard' },
      { id: genId(), type: 'rest', durationSeconds: 90, restType: 'standing' },
    ],
  },
  { id: genId(), type: 'cooldown' },
];

// Sample workout segments - 20min Tempo
const tempoWorkout: Segment[] = [
  { id: genId(), type: 'warmup' },
  { id: genId(), type: 'run', durationSeconds: 1200, paceRange: 'tempo' }, // 20min tempo
  { id: genId(), type: 'cooldown' },
];

// Sample workout segments - Pyramid
const pyramidWorkout: Segment[] = [
  { id: genId(), type: 'warmup' },
  { id: genId(), type: 'run', distanceMeters: 200, paceRange: 'hard' },
  { id: genId(), type: 'rest', durationSeconds: 60, restType: 'walking' },
  { id: genId(), type: 'run', distanceMeters: 400, paceRange: 'hard' },
  { id: genId(), type: 'rest', durationSeconds: 90, restType: 'walking' },
  { id: genId(), type: 'run', distanceMeters: 800, paceRange: 'threshold' },
  { id: genId(), type: 'rest', durationSeconds: 120, restType: 'walking' },
  { id: genId(), type: 'run', distanceMeters: 400, paceRange: 'hard' },
  { id: genId(), type: 'rest', durationSeconds: 90, restType: 'walking' },
  { id: genId(), type: 'run', distanceMeters: 200, paceRange: 'hard' },
  { id: genId(), type: 'cooldown' },
];

// Sample workout segments - Nested Repeats (3x2x400m)
const nestedRepeatWorkout: Segment[] = [
  { id: genId(), type: 'warmup' },
  {
    id: genId(),
    type: 'repeat',
    count: 3,
    segments: [
      {
        id: genId(),
        type: 'repeat',
        count: 2,
        segments: [
          { id: genId(), type: 'run', distanceMeters: 400, paceRange: 'hard' },
          { id: genId(), type: 'rest', durationSeconds: 45, restType: 'standing' },
        ],
      },
      { id: genId(), type: 'rest', durationSeconds: 180, restType: 'walking' },
    ],
  },
  { id: genId(), type: 'cooldown' },
];

// Mock members
const MEMBERS = {
  alice: { id: 'member-1', name: 'Alice Chen', profilePhotoUrl: null },
  bob: { id: 'member-2', name: 'Bob Smith', profilePhotoUrl: null },
  charlie: { id: 'member-3', name: 'Charlie Davis', profilePhotoUrl: null },
  diana: { id: 'member-4', name: 'Diana Lee', profilePhotoUrl: null },
};

// Current user (mock - Diana)
export const MOCK_CURRENT_USER: CurrentUser = {
  ...MEMBERS.diana,
  currentVoteProposalId: 'proposal-1', // Diana voted for Alice's proposal
};

// Mock proposals for current week
export const MOCK_PROPOSALS: WorkoutProposal[] = [
  {
    id: 'proposal-1',
    workout: {
      id: 'workout-1',
      name: '5x800m Intervals',
      wednesdayDate: '2026-02-04',
      notes: 'Classic interval session. Focus on consistent pacing!',
      segments: intervalWorkout,
    },
    proposer: MEMBERS.alice,
    voteCount: 3,
    hasVoted: true, // Current user voted for this
    createdAt: '2026-01-29T08:30:00+10:00',
  },
  {
    id: 'proposal-2',
    workout: {
      id: 'workout-2',
      name: '20min Tempo Run',
      wednesdayDate: '2026-02-04',
      notes: 'Build endurance with sustained effort. Find your rhythm!',
      segments: tempoWorkout,
    },
    proposer: MEMBERS.bob,
    voteCount: 2,
    hasVoted: false,
    createdAt: '2026-01-29T10:15:00+10:00',
  },
  {
    id: 'proposal-3',
    workout: {
      id: 'workout-3',
      name: 'Pyramid Session',
      wednesdayDate: '2026-02-04',
      notes: '200-400-800-400-200 with walking recovery. Great variety!',
      segments: pyramidWorkout,
    },
    proposer: MEMBERS.charlie,
    voteCount: 1,
    hasVoted: false,
    createdAt: '2026-01-30T07:45:00+10:00',
  },
  {
    id: 'proposal-4',
    workout: {
      id: 'workout-4',
      name: 'Nested 400s',
      wednesdayDate: '2026-02-04',
      notes: '3 sets of 2x400m with longer rest between sets. Quality over quantity.',
      segments: nestedRepeatWorkout,
    },
    proposer: MEMBERS.diana,
    voteCount: 0,
    hasVoted: false,
    createdAt: '2026-01-30T09:00:00+10:00',
  },
];

// Sample archived workouts - previous winners
const archivedIntervals: Segment[] = [
  { id: genId(), type: 'warmup' },
  {
    id: genId(),
    type: 'repeat',
    count: 6,
    segments: [
      { id: genId(), type: 'run', distanceMeters: 400, paceRange: 'hard' },
      { id: genId(), type: 'rest', durationSeconds: 60, restType: 'standing' },
    ],
  },
  { id: genId(), type: 'cooldown' },
];

const archivedHills: Segment[] = [
  { id: genId(), type: 'warmup' },
  {
    id: genId(),
    type: 'repeat',
    count: 8,
    segments: [
      { id: genId(), type: 'run', durationSeconds: 45, paceRange: 'hard' },
      { id: genId(), type: 'rest', durationSeconds: 90, restType: 'walking' },
    ],
  },
  { id: genId(), type: 'cooldown' },
];

// Mock archived workouts
export const MOCK_ARCHIVED: ArchivedWorkout[] = [
  {
    id: 'archive-1',
    workout: {
      id: 'workout-a1',
      name: '6x400m Fast Finish',
      wednesdayDate: '2026-01-28',
      notes: 'Short and sharp. Focus on the last 100m of each rep.',
      segments: archivedIntervals,
    },
    proposer: MEMBERS.bob,
    weekEndingDate: '2026-01-28',
    finalVoteCount: 4,
  },
  {
    id: 'archive-2',
    workout: {
      id: 'workout-a2',
      name: 'Hill Repeats',
      wednesdayDate: '2026-01-21',
      notes: '8x45s hard uphill efforts. Build that power!',
      segments: archivedHills,
    },
    proposer: MEMBERS.alice,
    weekEndingDate: '2026-01-21',
    finalVoteCount: 3,
  },
];
