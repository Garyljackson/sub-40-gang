-- RLS policies for workout proposals feature
-- Uses (select auth.uid()) pattern for performance

-- Enable RLS on all workout tables
ALTER TABLE workout_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_workouts ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Workout Proposals Policies
-- =============================================================================

-- All authenticated users can read proposals
CREATE POLICY "Proposals viewable by all authenticated users"
    ON workout_proposals FOR SELECT
    TO authenticated
    USING (true);

-- Users can create their own proposals
CREATE POLICY "Users can create their own proposals"
    ON workout_proposals FOR INSERT
    TO authenticated
    WITH CHECK (proposer_id = (select auth.uid()));

-- Users can update their own proposals
CREATE POLICY "Users can update their own proposals"
    ON workout_proposals FOR UPDATE
    TO authenticated
    USING (proposer_id = (select auth.uid()));

-- Users can delete their own proposals
CREATE POLICY "Users can delete their own proposals"
    ON workout_proposals FOR DELETE
    TO authenticated
    USING (proposer_id = (select auth.uid()));

-- =============================================================================
-- Workout Votes Policies
-- =============================================================================

-- All authenticated users can read votes (for counting)
CREATE POLICY "Votes viewable by all authenticated users"
    ON workout_votes FOR SELECT
    TO authenticated
    USING (true);

-- Users can create their own votes
CREATE POLICY "Users can create their own votes"
    ON workout_votes FOR INSERT
    TO authenticated
    WITH CHECK (member_id = (select auth.uid()));

-- Users can delete their own votes (to swap vote)
CREATE POLICY "Users can delete their own votes"
    ON workout_votes FOR DELETE
    TO authenticated
    USING (member_id = (select auth.uid()));

-- =============================================================================
-- Archived Workouts Policies
-- =============================================================================

-- All authenticated users can read archives
CREATE POLICY "Archives viewable by all authenticated users"
    ON archived_workouts FOR SELECT
    TO authenticated
    USING (true);

-- Note: Archives are inserted by service role (cron job), which bypasses RLS
