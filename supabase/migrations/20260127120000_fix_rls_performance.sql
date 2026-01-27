-- Fix RLS policy performance by wrapping auth.uid() with (select auth.uid())
-- This prevents re-evaluation for each row

-- Drop existing policies that need optimization
DROP POLICY IF EXISTS "Members can update their own record" ON members;
DROP POLICY IF EXISTS "Users can create their own reactions" ON reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON reactions;
DROP POLICY IF EXISTS "Users can view their own processed activities" ON processed_activities;

-- Recreate policies with optimized auth.uid() calls
CREATE POLICY "Members can update their own record"
    ON members FOR UPDATE
    TO authenticated
    USING (id = (select auth.uid()));

CREATE POLICY "Users can create their own reactions"
    ON reactions FOR INSERT
    TO authenticated
    WITH CHECK (member_id = (select auth.uid()));

CREATE POLICY "Users can delete their own reactions"
    ON reactions FOR DELETE
    TO authenticated
    USING (member_id = (select auth.uid()));

CREATE POLICY "Users can view their own processed activities"
    ON processed_activities FOR SELECT
    TO authenticated
    USING (member_id = (select auth.uid()));

-- Add missing index on reactions.member_id foreign key
CREATE INDEX IF NOT EXISTS idx_reactions_member_id ON reactions(member_id);
