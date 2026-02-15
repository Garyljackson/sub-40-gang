import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { alice } from '../fixtures/members';
import { runActivity } from '../fixtures/activities';
import { generateStream } from '../fixtures/strava-streams';

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');

// Mock Supabase client
const mockAchievementsSelect = vi.fn();
const mockAchievementsInsert = vi.fn();
const mockProcessedActivitiesUpsert = vi.fn();

vi.mock('@/lib/supabase-server', () => ({
  createServiceClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === 'achievements') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation(() => mockAchievementsSelect()),
            }),
          }),
          insert: vi.fn().mockImplementation((data: unknown) => mockAchievementsInsert(data)),
        };
      }
      if (table === 'processed_activities') {
        return {
          upsert: vi
            .fn()
            .mockImplementation((data: unknown, opts: unknown) =>
              mockProcessedActivitiesUpsert(data, opts)
            ),
        };
      }
      return {};
    },
  })),
}));

// Import after mocking
import { processActivity } from '@/lib/process-activity';

describe('processActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessedActivitiesUpsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('new achievements', () => {
    it('inserts new achievements when milestones are beaten', async () => {
      // No existing achievements
      mockAchievementsSelect.mockResolvedValue({ data: [], error: null });
      mockAchievementsInsert.mockResolvedValue({ error: null });

      // Stream at 3:50/km pace — beats all milestones under 4:00/km target
      const streams = generateStream(10000, 230);

      const result = await processActivity(alice.id, runActivity, streams);

      expect(result.newAchievements.length).toBeGreaterThan(0);
      expect(result.newImprovements).toEqual([]);
      expect(result.activityProcessed).toBe(true);
      expect(mockAchievementsInsert).toHaveBeenCalled();
    });

    it('does not insert achievements when pace is too slow', async () => {
      mockAchievementsSelect.mockResolvedValue({ data: [], error: null });

      // Stream at 5:00/km pace — too slow for any milestone (target is 4:00/km)
      const streams = generateStream(10000, 300);

      const result = await processActivity(alice.id, runActivity, streams);

      expect(result.newAchievements).toEqual([]);
      expect(result.newImprovements).toEqual([]);
      expect(mockAchievementsInsert).not.toHaveBeenCalled();
    });
  });

  describe('improvements', () => {
    it('detects improvement when new time is faster than existing', async () => {
      // Existing 1km achievement at 238 seconds
      mockAchievementsSelect.mockResolvedValue({
        data: [{ milestone: '1km', time_seconds: 238 }],
        error: null,
      });
      mockAchievementsInsert.mockResolvedValue({ error: null });

      // Stream at 3:50/km pace — 1km in ~230s, faster than existing 238s
      const streams = generateStream(2000, 230);

      const result = await processActivity(alice.id, runActivity, streams);

      expect(result.newImprovements).toHaveLength(1);
      const improvement = result.newImprovements[0]!;
      expect(improvement.milestone).toBe('1km');
      expect(improvement.previousTimeSeconds).toBe(238);
      expect(improvement.timeSeconds).toBeLessThan(238);
    });

    it('does not create improvement when time is equal', async () => {
      // Existing 1km at 230 seconds — also add 2km to avoid new achievement noise
      mockAchievementsSelect.mockResolvedValue({
        data: [
          { milestone: '1km', time_seconds: 230 },
          { milestone: '2km', time_seconds: 460 },
        ],
        error: null,
      });

      // Stream at exactly 230 sec/km — same time, not an improvement
      const streams = generateStream(2000, 230);

      const result = await processActivity(alice.id, runActivity, streams);

      expect(result.newImprovements).toEqual([]);
    });

    it('does not create improvement when time is slower', async () => {
      // Existing 1km at 220 seconds
      mockAchievementsSelect.mockResolvedValue({
        data: [{ milestone: '1km', time_seconds: 220 }],
        error: null,
      });

      // Stream at 230 sec/km — slower than existing 220
      const streams = generateStream(2000, 230);

      const result = await processActivity(alice.id, runActivity, streams);

      expect(result.newImprovements).toEqual([]);
    });

    it('inserts improvement with previous_time_seconds', async () => {
      mockAchievementsSelect.mockResolvedValue({
        data: [{ milestone: '1km', time_seconds: 238 }],
        error: null,
      });
      mockAchievementsInsert.mockResolvedValue({ error: null });

      const streams = generateStream(2000, 230);

      await processActivity(alice.id, runActivity, streams);

      // Check that insert was called with previous_time_seconds
      const insertCall = mockAchievementsInsert.mock.calls.find((call) => {
        const data = call[0] as Array<{ previous_time_seconds?: number }>;
        return data.some((row) => row.previous_time_seconds != null);
      });

      expect(insertCall).toBeDefined();
      const insertData = insertCall![0] as Array<{
        previous_time_seconds: number;
        milestone: string;
      }>;
      const improvement = insertData.find((row) => row.previous_time_seconds != null);
      expect(improvement).toBeDefined();
      expect(improvement!.previous_time_seconds).toBe(238);
      expect(improvement!.milestone).toBe('1km');
    });

    it('can detect both new achievements and improvements in same run', async () => {
      // Has 1km at 238s, but not 2km
      mockAchievementsSelect.mockResolvedValue({
        data: [{ milestone: '1km', time_seconds: 238 }],
        error: null,
      });
      mockAchievementsInsert.mockResolvedValue({ error: null });

      // Fast enough to beat 1km (improvement) AND unlock 2km (new)
      const streams = generateStream(5000, 230);

      const result = await processActivity(alice.id, runActivity, streams);

      // Should have 2km as new achievement (and possibly others)
      expect(result.newAchievements.some((a) => a.milestone === '2km')).toBe(true);
      // Should have 1km as improvement
      expect(result.newImprovements.some((i) => i.milestone === '1km')).toBe(true);
    });

    it('uses best existing time when multiple rows exist', async () => {
      // Two rows for 1km — best is 230s
      mockAchievementsSelect.mockResolvedValue({
        data: [
          { milestone: '1km', time_seconds: 238 },
          { milestone: '1km', time_seconds: 230 },
        ],
        error: null,
      });
      mockAchievementsInsert.mockResolvedValue({ error: null });

      // Stream at 228 sec/km — faster than 230 (the best), should improve
      const streams = generateStream(2000, 228);

      const result = await processActivity(alice.id, runActivity, streams);

      expect(result.newImprovements).toHaveLength(1);
      expect(result.newImprovements[0]!.previousTimeSeconds).toBe(230);
    });

    it('does not improve when only faster than worst but not best', async () => {
      // Two rows for 1km — best is 225s, worst is 238s
      mockAchievementsSelect.mockResolvedValue({
        data: [
          { milestone: '1km', time_seconds: 238 },
          { milestone: '1km', time_seconds: 225 },
        ],
        error: null,
      });

      // Stream at 230 sec/km — faster than 238 but NOT faster than 225
      const streams = generateStream(2000, 230);

      const result = await processActivity(alice.id, runActivity, streams);

      expect(result.newImprovements).toEqual([]);
    });
  });

  describe('processed activities', () => {
    it('includes improved milestones in processed activity record', async () => {
      mockAchievementsSelect.mockResolvedValue({
        data: [{ milestone: '1km', time_seconds: 238 }],
        error: null,
      });
      mockAchievementsInsert.mockResolvedValue({ error: null });

      const streams = generateStream(5000, 230);

      await processActivity(alice.id, runActivity, streams);

      // Check that processed activity includes both new and improved milestones
      expect(mockProcessedActivitiesUpsert).toHaveBeenCalled();
      const upsertData = mockProcessedActivitiesUpsert.mock.calls[0]![0] as {
        milestones_unlocked: string[] | null;
      };
      expect(upsertData.milestones_unlocked).toContain('1km'); // improvement
    });
  });

  describe('error handling', () => {
    it('throws when fetch fails', async () => {
      mockAchievementsSelect.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const streams = generateStream(2000, 230);

      await expect(processActivity(alice.id, runActivity, streams)).rejects.toThrow(
        'Failed to fetch existing achievements'
      );
    });

    it('throws when improvement insert fails', async () => {
      mockAchievementsSelect.mockResolvedValue({
        data: [{ milestone: '1km', time_seconds: 238 }],
        error: null,
      });
      mockAchievementsInsert.mockResolvedValue({
        error: { message: 'Insert failed' },
      });

      const streams = generateStream(2000, 230);

      await expect(processActivity(alice.id, runActivity, streams)).rejects.toThrow(
        'Failed to insert'
      );
    });
  });
});
