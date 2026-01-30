// Workout Proposals Feature Constants

import type { PaceRange, RestType } from './workout-types';

// Pace range display info (from spec)
export const PACE_RANGES: Record<PaceRange, { label: string; range: string; color: string }> = {
  recovery: { label: 'Recovery', range: '7:00+/km', color: 'bg-green-200' },
  easy: { label: 'Easy', range: '6:00-7:00/km', color: 'bg-green-300' },
  moderate: { label: 'Moderate', range: '5:30-6:00/km', color: 'bg-yellow-200' },
  tempo: { label: 'Tempo', range: '5:00-5:30/km', color: 'bg-yellow-400' },
  threshold: { label: 'Threshold', range: '4:30-5:00/km', color: 'bg-orange-300' },
  hard: { label: 'Hard', range: '4:00-4:30/km', color: 'bg-orange-500' },
  sprint: { label: 'Sprint', range: '<4:00/km', color: 'bg-red-500' },
};

// Segment type colors (from spec)
export const SEGMENT_COLORS = {
  warmup: 'bg-blue-200', // Light blue
  run: {
    // Intensity-based gradient
    recovery: 'bg-green-300',
    easy: 'bg-green-400',
    moderate: 'bg-yellow-300',
    tempo: 'bg-yellow-500',
    threshold: 'bg-orange-400',
    hard: 'bg-orange-500',
    sprint: 'bg-red-500',
    default: 'bg-orange-400', // No pace specified
  },
  rest: 'bg-gray-300', // Gray
  cooldown: 'bg-purple-200', // Light purple
};

// Rest type labels
export const REST_TYPE_LABELS: Record<RestType, string> = {
  standing: 'Standing Rest',
  walking: 'Walking',
  active: 'Active (light jog)',
};

// Workout name constraints
export const WORKOUT_NAME_MAX_LENGTH = 50;
export const WORKOUT_NOTES_MAX_LENGTH = 500;

// Workout builder defaults
export const DEFAULT_RUN_DISTANCE_METERS = 400;
export const DEFAULT_RUN_PACE: PaceRange = 'hard';
export const DEFAULT_REST_DURATION_SECONDS = 60;
export const DEFAULT_REST_TYPE: RestType = 'standing';
export const DEFAULT_REPEAT_COUNT = 4;
