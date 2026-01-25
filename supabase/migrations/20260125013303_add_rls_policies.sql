-- Enable RLS on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_activities ENABLE ROW LEVEL SECURITY;

-- Members: All authenticated users can read, users can only update their own
CREATE POLICY "Members are viewable by all authenticated users"
    ON members FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Members can update their own record"
    ON members FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- Achievements: All authenticated users can read
CREATE POLICY "Achievements are viewable by all authenticated users"
    ON achievements FOR SELECT
    TO authenticated
    USING (true);

-- Note: Achievements are inserted by service role (webhook processing), which bypasses RLS

-- Reactions: All authenticated users can read, users can manage their own
CREATE POLICY "Reactions are viewable by all authenticated users"
    ON reactions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can create their own reactions"
    ON reactions FOR INSERT
    TO authenticated
    WITH CHECK (member_id = auth.uid());

CREATE POLICY "Users can delete their own reactions"
    ON reactions FOR DELETE
    TO authenticated
    USING (member_id = auth.uid());

-- Webhook queue: Only service role access (no authenticated user policies needed)
-- Service role bypasses RLS, so this table is effectively admin-only

-- Processed activities: All authenticated users can read their own
CREATE POLICY "Users can view their own processed activities"
    ON processed_activities FOR SELECT
    TO authenticated
    USING (member_id = auth.uid());

-- Note: Processed activities are inserted by service role (webhook processing), which bypasses RLS
