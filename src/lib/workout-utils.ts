// Workout Proposals Feature Utilities

import type { Segment, PaceRange, RunSegment, RestSegment } from './workout-types';
import { PACE_RANGES, SEGMENT_COLORS, REST_TYPE_LABELS } from './workout-constants';

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins} min`;
}

/**
 * Format distance in meters to human readable
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return km % 1 === 0 ? `${km}km` : `${km.toFixed(1)}km`;
  }
  return `${meters}m`;
}

/**
 * Get pace range display string
 */
export function getPaceDisplay(paceRange: PaceRange): string {
  return PACE_RANGES[paceRange].label;
}

/**
 * Get segment color based on type and pace
 */
export function getSegmentColor(segment: Segment): string {
  switch (segment.type) {
    case 'warmup':
      return SEGMENT_COLORS.warmup;
    case 'cooldown':
      return SEGMENT_COLORS.cooldown;
    case 'rest':
      return SEGMENT_COLORS.rest;
    case 'run':
      return segment.paceRange ? SEGMENT_COLORS.run[segment.paceRange] : SEGMENT_COLORS.run.default;
    case 'repeat':
      return 'bg-gray-100 border-2 border-dashed border-gray-400';
    default:
      return 'bg-gray-200';
  }
}

/**
 * Get segment summary text
 */
export function getSegmentSummary(segment: Segment): string {
  switch (segment.type) {
    case 'warmup':
      return 'Warmup';
    case 'cooldown':
      return 'Cooldown';
    case 'run': {
      const run = segment as RunSegment;
      const distance = run.distanceMeters ? formatDistance(run.distanceMeters) : '';
      const duration = run.durationSeconds ? formatDuration(run.durationSeconds) : '';
      const pace = run.paceRange ? `@ ${PACE_RANGES[run.paceRange].label}` : '';
      return [distance || duration, pace].filter(Boolean).join(' ');
    }
    case 'rest': {
      const rest = segment as RestSegment;
      return `${formatDuration(rest.durationSeconds)} ${REST_TYPE_LABELS[rest.restType].toLowerCase()}`;
    }
    case 'repeat':
      return `${segment.count}x`;
    default:
      return '';
  }
}

/**
 * Get a short description of what's inside a repeat
 */
export function getRepeatContents(segment: Segment): string {
  if (segment.type !== 'repeat') return '';

  const parts: string[] = [];
  for (const inner of segment.segments) {
    if (inner.type === 'run') {
      const run = inner as RunSegment;
      const value = run.distanceMeters
        ? formatDistance(run.distanceMeters)
        : run.durationSeconds
          ? formatDuration(run.durationSeconds)
          : 'Run';
      const pace = run.paceRange ? ` @ ${PACE_RANGES[run.paceRange].label}` : '';
      parts.push(`${value}${pace}`);
    } else if (inner.type === 'rest') {
      const rest = inner as RestSegment;
      parts.push(`${formatDuration(rest.durationSeconds)} rest`);
    } else if (inner.type === 'repeat') {
      parts.push(`${inner.count}x [${getRepeatContents(inner)}]`);
    }
  }
  return parts.join(' + ');
}

/**
 * Get full repeat description with count
 */
export function getRepeatDescription(segment: Segment): string {
  if (segment.type !== 'repeat') return '';
  return `${segment.count}x (${getRepeatContents(segment)})`;
}

/**
 * Get segment detail text for tooltips
 */
export function getSegmentDetails(segment: Segment): {
  title: string;
  details: string[];
} {
  switch (segment.type) {
    case 'warmup':
      return { title: 'Warmup', details: ['Easy pace to prepare for workout'] };
    case 'cooldown':
      return { title: 'Cooldown', details: ['Easy pace to recover'] };
    case 'run': {
      const run = segment as RunSegment;
      const details: string[] = [];
      if (run.distanceMeters) details.push(formatDistance(run.distanceMeters));
      if (run.durationSeconds) details.push(formatDuration(run.durationSeconds));
      if (run.paceRange) {
        const pace = PACE_RANGES[run.paceRange];
        details.push(`${pace.label} (${pace.range})`);
      }
      return { title: 'Run', details };
    }
    case 'rest': {
      const rest = segment as RestSegment;
      return {
        title: 'Rest',
        details: [formatDuration(rest.durationSeconds), REST_TYPE_LABELS[rest.restType]],
      };
    }
    case 'repeat': {
      const contents = getRepeatContents(segment);
      return {
        title: `Repeat ${segment.count}x`,
        details: [contents],
      };
    }
    default:
      return { title: '', details: [] };
  }
}

/**
 * Format relative time (e.g., "2h ago", "3d ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

/**
 * Calculate estimated workout duration in seconds
 */
export function calculateWorkoutDuration(segments: Segment[]): number {
  let total = 0;

  for (const segment of segments) {
    switch (segment.type) {
      case 'warmup':
      case 'cooldown':
        total += 300; // Assume 5 min each
        break;
      case 'run':
        if (segment.durationSeconds) {
          total += segment.durationSeconds;
        } else if (segment.distanceMeters) {
          // Estimate based on moderate pace (~5:30/km)
          total += Math.round((segment.distanceMeters / 1000) * 330);
        }
        break;
      case 'rest':
        total += segment.durationSeconds;
        break;
      case 'repeat':
        total += calculateWorkoutDuration(segment.segments) * segment.count;
        break;
    }
  }

  return total;
}

/**
 * Format total duration for display (e.g., "~25 min", "~1h 15m")
 */
export function formatTotalDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `~${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `~${hours}h ${remainingMins}m`;
}

/**
 * Generate a unique ID for segments
 */
let idCounter = 100;
export function generateSegmentId(): string {
  return `seg-${idCounter++}`;
}

/**
 * Validate segments array
 */
export function validateSegments(segments: Segment[]): { valid: boolean; error?: string } {
  if (!Array.isArray(segments)) {
    return { valid: false, error: 'Segments must be an array' };
  }

  if (segments.length === 0) {
    return { valid: false, error: 'Workout must have at least one segment' };
  }

  for (const segment of segments) {
    if (!segment.id || !segment.type) {
      return { valid: false, error: 'Each segment must have an id and type' };
    }

    if (segment.type === 'run') {
      if (!segment.distanceMeters && !segment.durationSeconds) {
        return { valid: false, error: 'Run segment must have distance or duration' };
      }
    }

    if (segment.type === 'rest') {
      if (!segment.durationSeconds || segment.durationSeconds <= 0) {
        return { valid: false, error: 'Rest segment must have a positive duration' };
      }
      if (!segment.restType) {
        return { valid: false, error: 'Rest segment must have a rest type' };
      }
    }

    if (segment.type === 'repeat') {
      if (!segment.count || segment.count < 1) {
        return { valid: false, error: 'Repeat segment must have a count of at least 1' };
      }
      const nestedValidation = validateSegments(segment.segments);
      if (!nestedValidation.valid) {
        return nestedValidation;
      }
    }
  }

  return { valid: true };
}
