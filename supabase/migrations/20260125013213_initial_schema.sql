-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Milestone enum
CREATE TYPE milestone_type AS ENUM ('1km', '2km', '5km', '7.5km', '10km');

-- Queue status enum
CREATE TYPE queue_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Members table
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strava_athlete_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    profile_photo_url TEXT,
    strava_access_token TEXT NOT NULL,
    strava_refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Achievements table
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    milestone milestone_type NOT NULL,
    season INTEGER NOT NULL,
    strava_activity_id VARCHAR(255) NOT NULL,
    achieved_at TIMESTAMPTZ NOT NULL,
    distance DECIMAL(10, 2) NOT NULL, -- actual distance in meters
    time_seconds INTEGER NOT NULL,    -- actual time in seconds
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One achievement per milestone per member per season
    UNIQUE(member_id, milestone, season)
);

-- Reactions table
CREATE TABLE reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One reaction per member per achievement
    UNIQUE(achievement_id, member_id)
);

-- Webhook queue table (for async processing)
CREATE TABLE webhook_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strava_activity_id VARCHAR(255) NOT NULL,
    strava_athlete_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    status queue_status NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,

    -- Prevent duplicate queue entries for same activity
    UNIQUE(strava_activity_id)
);

-- Processed activities table (for "last synced run" visibility)
CREATE TABLE processed_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    strava_activity_id VARCHAR(255) NOT NULL,
    activity_name VARCHAR(255) NOT NULL,
    activity_date TIMESTAMPTZ NOT NULL,
    distance_meters DECIMAL(10, 2) NOT NULL,
    moving_time_seconds INTEGER NOT NULL,
    pace_seconds_per_km INTEGER NOT NULL,  -- calculated: moving_time / (distance/1000)
    milestones_unlocked VARCHAR(50)[] DEFAULT '{}',  -- e.g., ['1km', '2km']
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One entry per activity
    UNIQUE(strava_activity_id)
);

-- Indexes
CREATE INDEX idx_achievements_member_id ON achievements(member_id);
CREATE INDEX idx_achievements_season ON achievements(season);
CREATE INDEX idx_achievements_created_at ON achievements(created_at DESC);
CREATE INDEX idx_reactions_achievement_id ON reactions(achievement_id);
CREATE INDEX idx_members_strava_athlete_id ON members(strava_athlete_id);
CREATE INDEX idx_webhook_queue_status ON webhook_queue(status) WHERE status = 'pending';
CREATE INDEX idx_webhook_queue_created_at ON webhook_queue(created_at);
CREATE INDEX idx_processed_activities_member_id ON processed_activities(member_id);
CREATE INDEX idx_processed_activities_processed_at ON processed_activities(member_id, processed_at DESC);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to members table
CREATE TRIGGER members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
