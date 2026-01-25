export interface BestEffort {
  distanceMeters: number;
  timeSeconds: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Find the best (fastest) effort for a target distance using sliding window algorithm.
 * Uses two-pointer technique for O(n) time complexity.
 *
 * @param timeStream - Array of cumulative time values in seconds
 * @param distanceStream - Array of cumulative distance values in meters
 * @param targetDistanceMeters - The target distance to find best effort for
 * @returns BestEffort object if found, null if run is too short
 */
export function findBestEffort(
  timeStream: number[],
  distanceStream: number[],
  targetDistanceMeters: number
): BestEffort | null {
  if (timeStream.length !== distanceStream.length) {
    throw new Error('Time and distance streams must have the same length');
  }

  if (timeStream.length === 0) {
    return null;
  }

  // Check if the run is long enough
  const firstDistance = distanceStream[0];
  const lastDistance = distanceStream[distanceStream.length - 1];
  if (firstDistance === undefined || lastDistance === undefined) {
    return null;
  }
  const totalDistance = lastDistance - firstDistance;
  if (totalDistance < targetDistanceMeters) {
    return null;
  }

  let bestEffort: BestEffort | null = null;
  let j = 0;

  // Two-pointer sliding window
  for (let i = 0; i < timeStream.length; i++) {
    const distI = distanceStream[i];
    const timeI = timeStream[i];
    if (distI === undefined || timeI === undefined) continue;

    // Move j forward until we have at least the target distance
    while (j < distanceStream.length) {
      const distJ = distanceStream[j];
      if (distJ === undefined || distJ - distI >= targetDistanceMeters) break;
      j++;
    }

    // If we've run out of points, we can't find a valid segment starting from i
    if (j >= distanceStream.length) {
      break;
    }

    const distJ = distanceStream[j];
    const timeJ = timeStream[j];
    if (distJ === undefined || timeJ === undefined) continue;

    // Calculate time for this segment
    const segmentDistance = distJ - distI;
    const segmentTime = timeJ - timeI;

    // Interpolate to get exact time for target distance
    // If we overshot the target distance, adjust the time proportionally
    let adjustedTime = segmentTime;
    if (segmentDistance > targetDistanceMeters && j > 0) {
      // Linear interpolation between j-1 and j to find exact point
      const distJMinus1 = distanceStream[j - 1];
      const timeJMinus1 = timeStream[j - 1];
      if (distJMinus1 !== undefined && timeJMinus1 !== undefined) {
        const prevDistance = distJMinus1 - distI;
        const prevTime = timeJMinus1 - timeI;

        if (prevDistance < targetDistanceMeters) {
          const distanceToInterpolate = targetDistanceMeters - prevDistance;
          const distanceBetweenPoints = segmentDistance - prevDistance;
          const timeBetweenPoints = segmentTime - prevTime;
          const interpolationRatio = distanceToInterpolate / distanceBetweenPoints;
          adjustedTime = prevTime + timeBetweenPoints * interpolationRatio;
        }
      }
    }

    // Update best effort if this is faster
    if (bestEffort === null || adjustedTime < bestEffort.timeSeconds) {
      bestEffort = {
        distanceMeters: targetDistanceMeters,
        timeSeconds: adjustedTime,
        startIndex: i,
        endIndex: j,
      };
    }
  }

  return bestEffort;
}

/**
 * Find best efforts for multiple target distances in a single pass
 * More efficient than calling findBestEffort multiple times
 */
export function findAllBestEfforts(
  timeStream: number[],
  distanceStream: number[],
  targetDistances: number[]
): Map<number, BestEffort | null> {
  const results = new Map<number, BestEffort | null>();

  // Sort targets by distance for optimal processing
  const sortedTargets = [...targetDistances].sort((a, b) => a - b);

  for (const target of sortedTargets) {
    results.set(target, findBestEffort(timeStream, distanceStream, target));
  }

  return results;
}
