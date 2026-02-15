-- Allow milestone improvements (personal bests) by recording new achievement rows
-- when a member beats their previous time for an already-achieved milestone.

-- Add column to track the previous time (NULL = first achievement, set = improvement)
ALTER TABLE achievements ADD COLUMN previous_time_seconds INTEGER;

-- Drop the one-per-milestone-per-season constraint to allow improvement rows
ALTER TABLE achievements DROP CONSTRAINT achievements_member_id_milestone_season_key;

-- Prevent the same activity from creating duplicate achievement rows
CREATE UNIQUE INDEX idx_achievements_member_milestone_activity
    ON achievements(member_id, milestone, strava_activity_id);

-- Index for efficient querying by member/milestone/season (replaces old unique constraint for lookups)
CREATE INDEX idx_achievements_member_milestone_season
    ON achievements(member_id, milestone, season);
