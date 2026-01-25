import { describe, expect, it } from 'vitest';
import {
  MILESTONES,
  MILESTONE_KEYS,
  beatsMilestone,
  formatTime,
  type MilestoneKey,
} from '@/lib/milestones';

describe('MILESTONES constant', () => {
  it('has all five milestone keys', () => {
    expect(MILESTONE_KEYS).toEqual(['1km', '2km', '5km', '7.5km', '10km']);
    expect(Object.keys(MILESTONES)).toHaveLength(5);
  });

  it('has correct target times for 4:00/km pace', () => {
    // 4:00/km = 240 seconds/km
    expect(MILESTONES['1km'].targetTimeSeconds).toBe(4 * 60); // 240
    expect(MILESTONES['2km'].targetTimeSeconds).toBe(8 * 60); // 480
    expect(MILESTONES['5km'].targetTimeSeconds).toBe(20 * 60); // 1200
    expect(MILESTONES['7.5km'].targetTimeSeconds).toBe(30 * 60); // 1800
    expect(MILESTONES['10km'].targetTimeSeconds).toBe(40 * 60); // 2400
  });

  it('has correct distances in meters', () => {
    expect(MILESTONES['1km'].distanceMeters).toBe(1000);
    expect(MILESTONES['2km'].distanceMeters).toBe(2000);
    expect(MILESTONES['5km'].distanceMeters).toBe(5000);
    expect(MILESTONES['7.5km'].distanceMeters).toBe(7500);
    expect(MILESTONES['10km'].distanceMeters).toBe(10000);
  });

  it('has matching keys in each milestone object', () => {
    for (const key of MILESTONE_KEYS) {
      expect(MILESTONES[key].key).toBe(key);
    }
  });

  it('has display names for all milestones', () => {
    for (const key of MILESTONE_KEYS) {
      expect(MILESTONES[key].displayName).toBeDefined();
      expect(typeof MILESTONES[key].displayName).toBe('string');
    }
  });
});

describe('beatsMilestone', () => {
  describe('1km milestone (target: 4:00 = 240s)', () => {
    it('returns true when time equals target exactly', () => {
      expect(beatsMilestone('1km', 240)).toBe(true);
    });

    it('returns true when time is under target', () => {
      expect(beatsMilestone('1km', 239)).toBe(true);
      expect(beatsMilestone('1km', 200)).toBe(true);
      expect(beatsMilestone('1km', 1)).toBe(true);
    });

    it('returns false when time exceeds target', () => {
      expect(beatsMilestone('1km', 241)).toBe(false);
      expect(beatsMilestone('1km', 300)).toBe(false);
    });
  });

  describe('all milestones', () => {
    const testCases: [MilestoneKey, number, boolean][] = [
      // 1km (target: 240)
      ['1km', 240, true],
      ['1km', 239, true],
      ['1km', 241, false],
      // 2km (target: 480)
      ['2km', 480, true],
      ['2km', 479, true],
      ['2km', 481, false],
      // 5km (target: 1200)
      ['5km', 1200, true],
      ['5km', 1199, true],
      ['5km', 1201, false],
      // 7.5km (target: 1800)
      ['7.5km', 1800, true],
      ['7.5km', 1799, true],
      ['7.5km', 1801, false],
      // 10km (target: 2400)
      ['10km', 2400, true],
      ['10km', 2399, true],
      ['10km', 2401, false],
    ];

    it.each(testCases)('milestone %s with %d seconds returns %s', (milestone, time, expected) => {
      expect(beatsMilestone(milestone, time)).toBe(expected);
    });
  });

  it('handles zero seconds', () => {
    expect(beatsMilestone('1km', 0)).toBe(true);
    expect(beatsMilestone('10km', 0)).toBe(true);
  });

  it('handles fractional seconds by comparing as-is', () => {
    // 239.5 < 240, so should be true
    expect(beatsMilestone('1km', 239.5)).toBe(true);
    // 240.5 > 240, so should be false
    expect(beatsMilestone('1km', 240.5)).toBe(false);
  });
});

describe('formatTime', () => {
  it('formats 0 seconds as 0:00', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats seconds less than a minute', () => {
    expect(formatTime(30)).toBe('0:30');
    expect(formatTime(59)).toBe('0:59');
  });

  it('formats exactly one minute', () => {
    expect(formatTime(60)).toBe('1:00');
  });

  it('formats mixed minutes and seconds', () => {
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(125)).toBe('2:05');
    expect(formatTime(240)).toBe('4:00');
  });

  it('formats large times', () => {
    expect(formatTime(3599)).toBe('59:59');
    expect(formatTime(3600)).toBe('60:00');
    expect(formatTime(2400)).toBe('40:00');
  });

  it('pads single-digit seconds with zero', () => {
    expect(formatTime(61)).toBe('1:01');
    expect(formatTime(69)).toBe('1:09');
    expect(formatTime(305)).toBe('5:05');
  });

  it('handles fractional seconds by flooring', () => {
    expect(formatTime(90.5)).toBe('1:30');
    expect(formatTime(90.9)).toBe('1:30');
    expect(formatTime(91.1)).toBe('1:31');
  });

  it('formats typical milestone times', () => {
    expect(formatTime(235)).toBe('3:55'); // Fast 1km
    expect(formatTime(472)).toBe('7:52'); // Fast 2km
    expect(formatTime(1185)).toBe('19:45'); // Fast 5km
    expect(formatTime(1780)).toBe('29:40'); // Fast 7.5km
    expect(formatTime(2380)).toBe('39:40'); // Fast 10km
  });
});
