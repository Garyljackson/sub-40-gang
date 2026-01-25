import { describe, expect, it } from 'vitest';
import { findAllBestEfforts, findBestEffort } from '@/lib/best-effort';
import {
  emptyStreams,
  exactlyOneKmRun,
  exactTargetTime,
  fastTenKmRun,
  generateStream,
  longFastRun,
  mismatchedStreams,
  runWithFastBurst,
  shortRun,
  singlePointStream,
  slowFiveKmRun,
  variablePaceTenKm,
} from '../fixtures/strava-streams';

describe('findBestEffort', () => {
  describe('valid inputs - finding best segments', () => {
    it('finds fastest 1km segment in a fast 10km run', () => {
      const result = findBestEffort(fastTenKmRun.time, fastTenKmRun.distance, 1000);

      expect(result).not.toBeNull();
      expect(result!.distanceMeters).toBe(1000);
      // At 228 sec/km pace, 1km should take ~228 seconds
      expect(result!.timeSeconds).toBeCloseTo(228, 0);
      expect(result!.startIndex).toBeGreaterThanOrEqual(0);
      expect(result!.endIndex).toBeGreaterThan(result!.startIndex);
    });

    it('finds fastest 5km segment in a fast 10km run', () => {
      const result = findBestEffort(fastTenKmRun.time, fastTenKmRun.distance, 5000);

      expect(result).not.toBeNull();
      expect(result!.distanceMeters).toBe(5000);
      // At 228 sec/km pace, 5km should take ~1140 seconds
      expect(result!.timeSeconds).toBeCloseTo(1140, 0);
    });

    it('finds fastest 10km segment in a 10km run', () => {
      const result = findBestEffort(fastTenKmRun.time, fastTenKmRun.distance, 10000);

      expect(result).not.toBeNull();
      expect(result!.distanceMeters).toBe(10000);
      // At 228 sec/km pace, 10km should take ~2280 seconds
      expect(result!.timeSeconds).toBeCloseTo(2280, 0);
    });

    it('finds fastest segment in a slow run', () => {
      const result = findBestEffort(slowFiveKmRun.time, slowFiveKmRun.distance, 1000);

      expect(result).not.toBeNull();
      expect(result!.distanceMeters).toBe(1000);
      // At 300 sec/km pace, 1km should take ~300 seconds
      expect(result!.timeSeconds).toBeCloseTo(300, 0);
    });
  });

  describe('variable pace detection', () => {
    it('finds fastest segment in middle of variable pace run', () => {
      // The run has: slow 2km, fast 6km, slow 2km
      // Best 5km should be entirely within the fast middle section
      const result = findBestEffort(variablePaceTenKm.time, variablePaceTenKm.distance, 5000);

      expect(result).not.toBeNull();
      expect(result!.distanceMeters).toBe(5000);
      // The fast section is at 220 sec/km, so 5km should be ~1100 seconds
      expect(result!.timeSeconds).toBeCloseTo(1100, 1);
    });

    it('finds fast burst in the middle of a run', () => {
      // Run has: 1km at 270s/km, 1km at 210s/km (burst), 3km at 270s/km
      const result = findBestEffort(runWithFastBurst.time, runWithFastBurst.distance, 1000);

      expect(result).not.toBeNull();
      // Best 1km should be the fast burst at ~210 seconds
      expect(result!.timeSeconds).toBeCloseTo(210, 1);
    });
  });

  describe('runs too short for target', () => {
    it('returns null for run shorter than 1km target', () => {
      const result = findBestEffort(shortRun.time, shortRun.distance, 1000);
      expect(result).toBeNull();
    });

    it('returns null for 5km target on 3km run', () => {
      const threeKmRun = generateStream(3000, 240);
      const result = findBestEffort(threeKmRun.time, threeKmRun.distance, 5000);
      expect(result).toBeNull();
    });

    it('returns null for 10km target on 8km run', () => {
      const eightKmRun = generateStream(8000, 240);
      const result = findBestEffort(eightKmRun.time, eightKmRun.distance, 10000);
      expect(result).toBeNull();
    });
  });

  describe('exact distance matching', () => {
    it('handles run exactly equal to target distance', () => {
      const result = findBestEffort(exactlyOneKmRun.time, exactlyOneKmRun.distance, 1000);

      expect(result).not.toBeNull();
      expect(result!.distanceMeters).toBe(1000);
      // At 230 sec/km, should be ~230 seconds
      expect(result!.timeSeconds).toBeCloseTo(230, 0);
    });

    it('finds segment at exact target time boundary', () => {
      // exactTargetTime is at 240 sec/km pace for 1.5km
      const result = findBestEffort(exactTargetTime.time, exactTargetTime.distance, 1000);

      expect(result).not.toBeNull();
      expect(result!.distanceMeters).toBe(1000);
      expect(result!.timeSeconds).toBeCloseTo(240, 0);
    });
  });

  describe('interpolation accuracy', () => {
    it('interpolates time correctly when overshooting target distance', () => {
      // Create a stream with known interpolation requirements
      // Points at: 0m/0s, 500m/120s, 1100m/264s
      const time = [0, 120, 264];
      const distance = [0, 500, 1100];

      const result = findBestEffort(time, distance, 1000);

      expect(result).not.toBeNull();
      // Need to interpolate between 500m (120s) and 1100m (264s)
      // For 1000m: 500m to 1000m is 500m more at (264-120)/(1100-500) = 0.24 s/m
      // Time at 1000m = 120 + 500 * 0.24 = 120 + 120 = 240s
      expect(result!.timeSeconds).toBeCloseTo(240, 1);
    });

    it('finds best segment with interpolation in longer runs', () => {
      const result = findBestEffort(longFastRun.time, longFastRun.distance, 7500);

      expect(result).not.toBeNull();
      expect(result!.distanceMeters).toBe(7500);
      // At 235 sec/km, 7.5km should take ~1762.5 seconds
      expect(result!.timeSeconds).toBeCloseTo(1762.5, 1);
    });
  });

  describe('edge cases', () => {
    it('returns null for empty streams', () => {
      const result = findBestEffort(emptyStreams.time, emptyStreams.distance, 1000);
      expect(result).toBeNull();
    });

    it('throws error for mismatched stream lengths', () => {
      expect(() =>
        findBestEffort(mismatchedStreams.time, mismatchedStreams.distance, 1000)
      ).toThrow('Time and distance streams must have the same length');
    });

    it('returns null for single-point stream', () => {
      const result = findBestEffort(singlePointStream.time, singlePointStream.distance, 1000);
      expect(result).toBeNull();
    });

    it('handles stream starting at non-zero distance', () => {
      // Simulate a stream that starts mid-activity
      const time = [0, 60, 120, 180, 240, 300];
      const distance = [100, 350, 600, 850, 1100, 1350]; // Starts at 100m

      const result = findBestEffort(time, distance, 1000);

      expect(result).not.toBeNull();
      expect(result!.distanceMeters).toBe(1000);
    });

    it('handles very small target distances', () => {
      const result = findBestEffort(
        fastTenKmRun.time,
        fastTenKmRun.distance,
        100 // 100m
      );

      expect(result).not.toBeNull();
      expect(result!.distanceMeters).toBe(100);
      // At 228 sec/km, 100m should take ~22.8 seconds
      expect(result!.timeSeconds).toBeCloseTo(22.8, 1);
    });
  });

  describe('result object structure', () => {
    it('returns correct result structure', () => {
      const result = findBestEffort(fastTenKmRun.time, fastTenKmRun.distance, 1000);

      expect(result).toHaveProperty('distanceMeters');
      expect(result).toHaveProperty('timeSeconds');
      expect(result).toHaveProperty('startIndex');
      expect(result).toHaveProperty('endIndex');

      expect(typeof result!.distanceMeters).toBe('number');
      expect(typeof result!.timeSeconds).toBe('number');
      expect(typeof result!.startIndex).toBe('number');
      expect(typeof result!.endIndex).toBe('number');
    });

    it('returns indices within valid range', () => {
      const result = findBestEffort(fastTenKmRun.time, fastTenKmRun.distance, 1000);

      expect(result!.startIndex).toBeGreaterThanOrEqual(0);
      expect(result!.startIndex).toBeLessThan(fastTenKmRun.time.length);
      expect(result!.endIndex).toBeGreaterThanOrEqual(0);
      expect(result!.endIndex).toBeLessThan(fastTenKmRun.time.length);
      expect(result!.endIndex).toBeGreaterThan(result!.startIndex);
    });
  });
});

describe('findAllBestEfforts', () => {
  it('returns Map with results for all target distances', () => {
    const targets = [1000, 2000, 5000];
    const results = findAllBestEfforts(fastTenKmRun.time, fastTenKmRun.distance, targets);

    expect(results).toBeInstanceOf(Map);
    expect(results.size).toBe(3);
    expect(results.has(1000)).toBe(true);
    expect(results.has(2000)).toBe(true);
    expect(results.has(5000)).toBe(true);
  });

  it('returns null for unreachable targets', () => {
    const targets = [1000, 2000, 20000]; // 20km is unreachable for 10km run
    const results = findAllBestEfforts(fastTenKmRun.time, fastTenKmRun.distance, targets);

    expect(results.get(1000)).not.toBeNull();
    expect(results.get(2000)).not.toBeNull();
    expect(results.get(20000)).toBeNull();
  });

  it('returns correct times for each target', () => {
    const targets = [1000, 5000, 10000];
    const results = findAllBestEfforts(fastTenKmRun.time, fastTenKmRun.distance, targets);

    // All should be at ~228 sec/km pace
    expect(results.get(1000)!.timeSeconds).toBeCloseTo(228, 0);
    expect(results.get(5000)!.timeSeconds).toBeCloseTo(1140, 0);
    expect(results.get(10000)!.timeSeconds).toBeCloseTo(2280, 0);
  });

  it('handles unsorted target distances', () => {
    const targets = [5000, 1000, 10000, 2000]; // Not sorted
    const results = findAllBestEfforts(fastTenKmRun.time, fastTenKmRun.distance, targets);

    expect(results.size).toBe(4);
    expect(results.get(1000)).not.toBeNull();
    expect(results.get(2000)).not.toBeNull();
    expect(results.get(5000)).not.toBeNull();
    expect(results.get(10000)).not.toBeNull();
  });

  it('handles empty targets array', () => {
    const results = findAllBestEfforts(fastTenKmRun.time, fastTenKmRun.distance, []);

    expect(results).toBeInstanceOf(Map);
    expect(results.size).toBe(0);
  });

  it('handles all unreachable targets', () => {
    const results = findAllBestEfforts(shortRun.time, shortRun.distance, [1000, 2000, 5000]);

    expect(results.get(1000)).toBeNull();
    expect(results.get(2000)).toBeNull();
    expect(results.get(5000)).toBeNull();
  });

  it('uses milestone distances correctly', () => {
    // Test with actual S40G milestone distances
    const milestoneDistances = [1000, 2000, 5000, 7500, 10000];
    const results = findAllBestEfforts(
      fastTenKmRun.time,
      fastTenKmRun.distance,
      milestoneDistances
    );

    expect(results.size).toBe(5);
    for (const distance of milestoneDistances) {
      expect(results.has(distance)).toBe(true);
      expect(results.get(distance)).not.toBeNull();
    }
  });
});
