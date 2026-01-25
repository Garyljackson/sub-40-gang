-- Allow NULL for Strava token columns to support deauthorization
-- When a user deauthorizes the app via Strava, we clear their tokens by setting them to NULL

ALTER TABLE members
    ALTER COLUMN strava_access_token DROP NOT NULL,
    ALTER COLUMN strava_refresh_token DROP NOT NULL,
    ALTER COLUMN token_expires_at DROP NOT NULL;

COMMENT ON COLUMN members.strava_access_token IS 'Strava OAuth access token. NULL when user has deauthorized.';
COMMENT ON COLUMN members.strava_refresh_token IS 'Strava OAuth refresh token. NULL when user has deauthorized.';
COMMENT ON COLUMN members.token_expires_at IS 'Token expiry timestamp. NULL when user has deauthorized.';
