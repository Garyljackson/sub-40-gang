-- supabase/seed.sql

-- Test members (no real Strava tokens needed for UI testing)
-- profile_photo_url is NULL - Avatar component shows initials as fallback
INSERT INTO members (id, strava_athlete_id, name, profile_photo_url, strava_access_token, strava_refresh_token, token_expires_at, joined_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '10001', 'Alice Runner', NULL, 'fake-token', 'fake-refresh', NOW() + INTERVAL '1 day', '2026-01-01'),
  ('22222222-2222-2222-2222-222222222222', '10002', 'Bob Jogger', NULL, 'fake-token', 'fake-refresh', NOW() + INTERVAL '1 day', '2026-01-05'),
  ('33333333-3333-3333-3333-333333333333', '10003', 'Charlie Sprinter', NULL, 'fake-token', 'fake-refresh', NOW() + INTERVAL '1 day', '2026-01-10');

-- Test achievements (various milestones for leaderboard testing)
INSERT INTO achievements (member_id, milestone, season, strava_activity_id, achieved_at, distance, time_seconds)
VALUES
  -- Alice: All milestones
  ('11111111-1111-1111-1111-111111111111', '1km', 2026, 'act-1001', '2026-01-02 08:00:00', 1000, 235),
  ('11111111-1111-1111-1111-111111111111', '2km', 2026, 'act-1002', '2026-01-05 08:00:00', 2000, 472),
  ('11111111-1111-1111-1111-111111111111', '5km', 2026, 'act-1003', '2026-01-10 08:00:00', 5000, 1185),
  ('11111111-1111-1111-1111-111111111111', '7.5km', 2026, 'act-1004', '2026-01-15 08:00:00', 7500, 1780),
  ('11111111-1111-1111-1111-111111111111', '10km', 2026, 'act-1005', '2026-01-20 08:00:00', 10000, 2380),

  -- Bob: Partial progress
  ('22222222-2222-2222-2222-222222222222', '1km', 2026, 'act-2001', '2026-01-06 09:00:00', 1000, 238),
  ('22222222-2222-2222-2222-222222222222', '2km', 2026, 'act-2002', '2026-01-10 09:00:00', 2000, 478),

  -- Charlie: Just started
  ('33333333-3333-3333-3333-333333333333', '1km', 2026, 'act-3001', '2026-01-12 07:00:00', 1000, 239);

-- Test reactions
INSERT INTO reactions (achievement_id, member_id, emoji)
SELECT a.id, '22222222-2222-2222-2222-222222222222', '🔥'
FROM achievements a WHERE a.member_id = '11111111-1111-1111-1111-111111111111' AND a.milestone = '10km';

INSERT INTO reactions (achievement_id, member_id, emoji)
SELECT a.id, '33333333-3333-3333-3333-333333333333', '💪'
FROM achievements a WHERE a.member_id = '11111111-1111-1111-1111-111111111111' AND a.milestone = '10km';

INSERT INTO reactions (achievement_id, member_id, emoji)
SELECT a.id, '11111111-1111-1111-1111-111111111111', '👏'
FROM achievements a WHERE a.member_id = '22222222-2222-2222-2222-222222222222' AND a.milestone = '2km';

-- Test processed activities (for "last synced run" visibility)
INSERT INTO processed_activities (member_id, strava_activity_id, activity_name, activity_date, distance_meters, moving_time_seconds, pace_seconds_per_km, milestones_unlocked)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'act-1005', 'Morning 10k PB!', '2026-01-20 08:00:00', 10000, 2380, 238, ARRAY['10km']),
  ('22222222-2222-2222-2222-222222222222', 'act-2002', 'Easy morning run', '2026-01-10 09:00:00', 5200, 1560, 300, ARRAY['2km']),
  ('33333333-3333-3333-3333-333333333333', 'act-3001', 'First fast km!', '2026-01-12 07:00:00', 3500, 980, 280, ARRAY['1km']);
