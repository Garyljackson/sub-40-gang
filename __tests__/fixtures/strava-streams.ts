/**
 * Test fixtures for Strava activity streams
 * Used for testing the sliding window algorithm in best-effort.ts
 */

export interface TestStream {
  time: number[]; // Cumulative seconds from start
  distance: number[]; // Cumulative meters from start
}

/**
 * Generate a realistic activity stream with consistent pace
 * @param totalDistanceMeters - Total distance of the run
 * @param paceSecondsPerKm - Pace in seconds per kilometer
 * @param sampleIntervalMeters - Distance between data points (default 10m)
 */
export function generateStream(
  totalDistanceMeters: number,
  paceSecondsPerKm: number,
  sampleIntervalMeters: number = 10
): TestStream {
  const time: number[] = [];
  const distance: number[] = [];

  const secondsPerMeter = paceSecondsPerKm / 1000;
  const numPoints = Math.floor(totalDistanceMeters / sampleIntervalMeters) + 1;

  for (let i = 0; i < numPoints; i++) {
    const dist = i * sampleIntervalMeters;
    const t = dist * secondsPerMeter;
    distance.push(dist);
    time.push(t);
  }

  return { time, distance };
}

/**
 * Generate a stream with variable pace sections
 * @param sections - Array of { distanceMeters, paceSecondsPerKm }
 */
export function generateVariablePaceStream(
  sections: { distanceMeters: number; paceSecondsPerKm: number }[],
  sampleIntervalMeters: number = 10
): TestStream {
  const time: number[] = [0];
  const distance: number[] = [0];

  let currentDistance = 0;
  let currentTime = 0;

  for (const section of sections) {
    const secondsPerMeter = section.paceSecondsPerKm / 1000;
    const sectionEnd = currentDistance + section.distanceMeters;

    while (currentDistance < sectionEnd) {
      currentDistance += sampleIntervalMeters;
      if (currentDistance > sectionEnd) currentDistance = sectionEnd;
      currentTime += sampleIntervalMeters * secondsPerMeter;
      distance.push(currentDistance);
      time.push(currentTime);
    }
  }

  return { time, distance };
}

// ============================================================================
// Pre-built Test Fixtures
// ============================================================================

/**
 * Fast 10km run at ~3:48/km pace (228 sec/km)
 * Total time: ~38 minutes (2280 seconds)
 * Beats all milestones (4:00/km = 240 sec/km target)
 */
export const fastTenKmRun = generateStream(10000, 228);

/**
 * Slow 5km run at ~5:00/km pace (300 sec/km)
 * Total time: ~25 minutes (1500 seconds)
 * Only beats 1km and 2km milestones
 */
export const slowFiveKmRun = generateStream(5000, 300);

/**
 * Variable pace 10km - fast middle section
 * First 2km: slow (5:00/km = 300 sec/km)
 * Middle 6km: fast (3:40/km = 220 sec/km) - this is the best segment
 * Last 2km: slow (5:00/km = 300 sec/km)
 *
 * Best 5km segment should be in the middle at ~220 sec/km
 */
export const variablePaceTenKm = generateVariablePaceStream([
  { distanceMeters: 2000, paceSecondsPerKm: 300 }, // 10 min
  { distanceMeters: 6000, paceSecondsPerKm: 220 }, // 22 min - fastest section
  { distanceMeters: 2000, paceSecondsPerKm: 300 }, // 10 min
]);

/**
 * Short run - only 800m
 * Too short for any milestone (minimum is 1km)
 */
export const shortRun = generateStream(800, 240);

/**
 * Run with exactly target time for 1km (4:00 = 240 seconds)
 * At exactly 240 sec/km pace, so 1km takes exactly 240 seconds
 */
export const exactTargetTime = generateStream(1500, 240);

/**
 * Empty streams - edge case for empty activity
 */
export const emptyStreams: TestStream = {
  time: [],
  distance: [],
};

/**
 * Mismatched stream lengths - error case
 * Time has 3 elements, distance has 2
 */
export const mismatchedStreams = {
  time: [0, 60, 120],
  distance: [0, 250],
};

/**
 * Single point stream - edge case
 */
export const singlePointStream: TestStream = {
  time: [0],
  distance: [0],
};

/**
 * Run exactly 1km at varying but fast pace
 * Used for testing edge case where run distance equals target exactly
 */
export const exactlyOneKmRun = generateStream(1000, 230);

/**
 * Very long run (15km) at consistent fast pace
 * For testing that algorithm finds best segment in longer runs
 */
export const longFastRun = generateStream(15000, 235);

/**
 * Run with a fast burst in the middle
 * 0-1km: 4:30/km (270 sec/km)
 * 1-2km: 3:30/km (210 sec/km) - BURST
 * 2-5km: 4:30/km (270 sec/km)
 *
 * The 1km best effort should find the 210 sec segment
 */
export const runWithFastBurst = generateVariablePaceStream([
  { distanceMeters: 1000, paceSecondsPerKm: 270 },
  { distanceMeters: 1000, paceSecondsPerKm: 210 }, // Fast burst - should be detected
  { distanceMeters: 3000, paceSecondsPerKm: 270 },
]);
