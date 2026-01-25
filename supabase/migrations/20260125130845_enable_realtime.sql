-- Enable Supabase Realtime for achievements and reactions tables
-- This allows clients to subscribe to changes in real-time

ALTER PUBLICATION supabase_realtime ADD TABLE achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
