import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BRISBANE_TIMEZONE,
  getCurrentSeason,
  getSeasonEnd,
  getSeasonForDate,
  getSeasonStart,
  toBrisbaneISO,
} from '@/lib/timezone';

describe('BRISBANE_TIMEZONE', () => {
  it('is set to Australia/Brisbane', () => {
    expect(BRISBANE_TIMEZONE).toBe('Australia/Brisbane');
  });
});

describe('getSeasonForDate', () => {
  it('returns correct year for mid-year date', () => {
    const date = new Date('2026-06-15T12:00:00Z');
    expect(getSeasonForDate(date)).toBe(2026);
  });

  it('returns correct year for date at start of year', () => {
    const date = new Date('2026-01-01T10:00:00Z'); // 20:00 Brisbane
    expect(getSeasonForDate(date)).toBe(2026);
  });

  it('returns correct year for date at end of year', () => {
    const date = new Date('2026-12-31T12:00:00Z'); // 22:00 Brisbane
    expect(getSeasonForDate(date)).toBe(2026);
  });

  describe('year boundary edge cases', () => {
    it('handles Dec 31 23:00 UTC as still 2026 in Brisbane (next day in Brisbane)', () => {
      // Dec 31 23:00 UTC = Jan 1 09:00 Brisbane (+10 hours)
      const date = new Date('2026-12-31T23:00:00Z');
      expect(getSeasonForDate(date)).toBe(2027);
    });

    it('handles Dec 31 13:00 UTC as still 2026 in Brisbane', () => {
      // Dec 31 13:00 UTC = Dec 31 23:00 Brisbane
      const date = new Date('2026-12-31T13:00:00Z');
      expect(getSeasonForDate(date)).toBe(2026);
    });

    it('handles Jan 1 00:00 UTC as already 2027 in Brisbane', () => {
      // Jan 1 00:00 UTC = Jan 1 10:00 Brisbane
      const date = new Date('2027-01-01T00:00:00Z');
      expect(getSeasonForDate(date)).toBe(2027);
    });

    it('handles Dec 31 14:00 UTC as 2027 in Brisbane (midnight crossing)', () => {
      // Dec 31 14:00 UTC = Jan 1 00:00 Brisbane
      const date = new Date('2026-12-31T14:00:00Z');
      expect(getSeasonForDate(date)).toBe(2027);
    });
  });

  it('handles different years', () => {
    expect(getSeasonForDate(new Date('2024-05-15T00:00:00Z'))).toBe(2024);
    expect(getSeasonForDate(new Date('2025-05-15T00:00:00Z'))).toBe(2025);
    expect(getSeasonForDate(new Date('2030-05-15T00:00:00Z'))).toBe(2030);
  });
});

describe('getCurrentSeason', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns current year when in mid-year', () => {
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    expect(getCurrentSeason()).toBe(2026);
  });

  it('returns correct year at Brisbane year boundary', () => {
    // Dec 31 13:00 UTC = Dec 31 23:00 Brisbane -> still 2026
    vi.setSystemTime(new Date('2026-12-31T13:00:00Z'));
    expect(getCurrentSeason()).toBe(2026);

    // Dec 31 14:00 UTC = Jan 1 00:00 Brisbane -> now 2027
    vi.setSystemTime(new Date('2026-12-31T14:00:00Z'));
    expect(getCurrentSeason()).toBe(2027);
  });

  it('returns 2026 for dates in 2026', () => {
    vi.setSystemTime(new Date('2026-03-15T00:00:00Z'));
    expect(getCurrentSeason()).toBe(2026);
  });
});

describe('toBrisbaneISO', () => {
  it('formats date in Brisbane timezone with T separator', () => {
    const date = new Date('2026-01-15T00:00:00Z'); // UTC midnight
    const result = toBrisbaneISO(date);

    // Brisbane is +10, so midnight UTC is 10:00 Brisbane
    expect(result).toBe('2026-01-15T10:00:00');
  });

  it('handles date crossing day boundary', () => {
    // Dec 31 20:00 UTC = Jan 1 06:00 Brisbane
    const date = new Date('2026-12-31T20:00:00Z');
    const result = toBrisbaneISO(date);

    expect(result).toBe('2027-01-01T06:00:00');
  });

  it('returns string in ISO-like format', () => {
    const date = new Date('2026-06-15T08:30:00Z');
    const result = toBrisbaneISO(date);

    // Should match YYYY-MM-DDTHH:mm:ss pattern
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });

  it('formats various times correctly', () => {
    // Morning UTC -> afternoon Brisbane
    expect(toBrisbaneISO(new Date('2026-01-15T02:30:00Z'))).toBe('2026-01-15T12:30:00');

    // Evening UTC -> early morning Brisbane (next day)
    expect(toBrisbaneISO(new Date('2026-01-15T18:00:00Z'))).toBe('2026-01-16T04:00:00');
  });
});

describe('getSeasonStart', () => {
  it('returns Jan 1 00:00:00 Brisbane time as UTC Date', () => {
    const start = getSeasonStart(2026);

    // Jan 1 00:00:00 Brisbane = Dec 31 14:00:00 UTC (previous day)
    expect(start.toISOString()).toBe('2025-12-31T14:00:00.000Z');
  });

  it('returns correct UTC time for different years', () => {
    expect(getSeasonStart(2024).toISOString()).toBe('2023-12-31T14:00:00.000Z');
    expect(getSeasonStart(2025).toISOString()).toBe('2024-12-31T14:00:00.000Z');
    expect(getSeasonStart(2027).toISOString()).toBe('2026-12-31T14:00:00.000Z');
  });

  it('returns a Date object', () => {
    const start = getSeasonStart(2026);
    expect(start).toBeInstanceOf(Date);
  });
});

describe('getSeasonEnd', () => {
  it('returns Dec 31 23:59:59 Brisbane time as UTC Date', () => {
    const end = getSeasonEnd(2026);

    // Dec 31 23:59:59 Brisbane = Dec 31 13:59:59 UTC (same day)
    expect(end.toISOString()).toBe('2026-12-31T13:59:59.000Z');
  });

  it('returns correct UTC time for different years', () => {
    expect(getSeasonEnd(2024).toISOString()).toBe('2024-12-31T13:59:59.000Z');
    expect(getSeasonEnd(2025).toISOString()).toBe('2025-12-31T13:59:59.000Z');
    expect(getSeasonEnd(2027).toISOString()).toBe('2027-12-31T13:59:59.000Z');
  });

  it('returns a Date object', () => {
    const end = getSeasonEnd(2026);
    expect(end).toBeInstanceOf(Date);
  });
});

describe('season boundaries', () => {
  it('season start is before season end', () => {
    const start = getSeasonStart(2026);
    const end = getSeasonEnd(2026);

    expect(start.getTime()).toBeLessThan(end.getTime());
  });

  it('season is approximately one year long', () => {
    const start = getSeasonStart(2026);
    const end = getSeasonEnd(2026);

    const durationMs = end.getTime() - start.getTime();
    const durationDays = durationMs / (1000 * 60 * 60 * 24);

    // Should be very close to 365 days (within a few seconds)
    expect(durationDays).toBeGreaterThan(364.9);
    expect(durationDays).toBeLessThan(365.1);
  });

  it('consecutive seasons do not overlap', () => {
    const end2025 = getSeasonEnd(2025);
    const start2026 = getSeasonStart(2026);

    // Start of 2026 should be after end of 2025
    expect(start2026.getTime()).toBeGreaterThan(end2025.getTime());

    // Gap should be exactly 1 second
    const gapMs = start2026.getTime() - end2025.getTime();
    expect(gapMs).toBe(1000);
  });
});
