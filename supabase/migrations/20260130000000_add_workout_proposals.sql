-- Workout Proposals Feature
-- Allows members to propose, vote on, and archive weekly Wednesday workouts

-- Pace range enum (matches spec)
CREATE TYPE pace_range AS ENUM (
    'recovery',   -- 7:00+/km
    'easy',       -- 6:00-7:00/km
    'moderate',   -- 5:30-6:00/km
    'tempo',      -- 5:00-5:30/km
    'threshold',  -- 4:30-5:00/km
    'hard',       -- 4:00-4:30/km
    'sprint'      -- <4:00/km
);

-- Rest type enum
CREATE TYPE rest_type AS ENUM ('standing', 'walking', 'active');

-- Workout proposals table
-- Contains workout definition (segments as JSONB) and proposal metadata
CREATE TABLE workout_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Workout data (embedded, not separate table)
    name VARCHAR(50) NOT NULL,
    notes TEXT,  -- Max 500 chars enforced at app level
    segments JSONB NOT NULL,  -- Segment[] structure
    wednesday_date DATE NOT NULL,  -- The Wednesday this workout is proposed for

    -- Proposal metadata
    proposer_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Validate segments is an array
    CONSTRAINT valid_segments CHECK (jsonb_typeof(segments) = 'array')
);

-- Workout votes table (one vote per member per week)
CREATE TABLE workout_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES workout_proposals(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    wednesday_date DATE NOT NULL,  -- Denormalized for unique constraint
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One vote per member per week (swappable by deleting and re-inserting)
    UNIQUE(member_id, wednesday_date)
);

-- Archived workouts table (past winners)
-- Stores snapshot of winning workout with denormalized proposer info
CREATE TABLE archived_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Snapshot of winning workout
    name VARCHAR(50) NOT NULL,
    notes TEXT,
    segments JSONB NOT NULL,
    wednesday_date DATE NOT NULL,

    -- Snapshot of proposer at archive time (denormalized for history)
    proposer_id UUID REFERENCES members(id) ON DELETE SET NULL,
    proposer_name VARCHAR(255) NOT NULL,
    proposer_profile_photo_url TEXT,

    -- Archive metadata
    final_vote_count INTEGER NOT NULL DEFAULT 0,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Only one winner per week
    UNIQUE(wednesday_date),

    -- Validate segments is an array
    CONSTRAINT archived_valid_segments CHECK (jsonb_typeof(segments) = 'array')
);

-- Indexes for workout_proposals
CREATE INDEX idx_workout_proposals_wednesday_date ON workout_proposals(wednesday_date);
CREATE INDEX idx_workout_proposals_proposer_id ON workout_proposals(proposer_id);
CREATE INDEX idx_workout_proposals_created_at ON workout_proposals(created_at);

-- Indexes for workout_votes
CREATE INDEX idx_workout_votes_proposal_id ON workout_votes(proposal_id);
CREATE INDEX idx_workout_votes_member_id ON workout_votes(member_id);
CREATE INDEX idx_workout_votes_wednesday_date ON workout_votes(wednesday_date);

-- Indexes for archived_workouts
CREATE INDEX idx_archived_workouts_wednesday_date ON archived_workouts(wednesday_date DESC);

-- Apply updated_at trigger to workout_proposals
CREATE TRIGGER workout_proposals_updated_at
    BEFORE UPDATE ON workout_proposals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
