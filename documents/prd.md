# S40G - Product Requirements Document

## Overview

**S40G** (Sub 40 Gang) is a mobile-first web app that tracks and celebrates milestone achievements for a social running group working toward a shared goal: running 10km in under 40 minutes.

The app connects to Strava, automatically detects qualifying runs, awards milestone achievements, and surfaces progress across the group through a social activity feed.

---

## Vision

Transform a single intimidating goal into a series of celebratory moments. Every milestone unlocked is a win worth sharing.

---

## Target Users

- Members of the Sub 40 Gang running group
- All members use Strava to track runs
- Small, tight-knit group (likely under 20 people)

---

## Goals

### User Goals
- See clear progress toward the 10km sub-40 goal
- Celebrate incremental achievements along the way
- Stay motivated by seeing groupmates' progress
- Hype each other up through reactions

### Business Goals (v1)
- Functional MVP that the group actively uses
- Seamless Strava integration
- Zero friction onboarding

---

## Features

### v1 (MVP)

| Feature | Description |
|---------|-------------|
| Strava Authentication | Sign in with Strava - no separate account needed |
| Milestone Tracking | 5 core milestones automatically detected from Strava data |
| Activity Feed | Chronological feed of achievements across the group |
| Leaderboard | Shows milestone progress for all members |
| Reactions | Members can react to achievements (🎉, 🔥, etc.) |
| Auto Seasons | Challenge period auto-resets each calendar year |
| PWA | Installable on mobile, works offline for viewing |

### v2 (Future)

| Feature | Description |
|---------|-------------|
| Push Notifications | Alerts when groupmates unlock achievements |
| Past Seasons | View achievement history from previous years |
| Additional Achievements | Consistency streaks, volume milestones, PBs |

---

## Milestone Structure

All milestones are based on the target pace of 4:00/km.

| Milestone | Distance | Target Time |
|-----------|----------|-------------|
| 🥉 | 1km | 4:00 |
| 🥈 | 2km | 8:00 |
| 🥇 | 5km | 20:00 |
| 🏅 | 7.5km | 30:00 |
| 🏆 | 10km | 40:00 |

### Achievement Logic

A milestone is unlocked when a member completes a run where **either**:

1. **Overall run**: Total distance ≥ milestone distance AND total time ≤ target time
2. **Best segment**: Any segment within the run covers the milestone distance in ≤ target time

This means a long slow run can still unlock milestones if the runner had a fast segment within it. For example, a 15km run completed in 70 minutes could still unlock the 5km milestone if any 5km segment within that run was completed in under 20 minutes.

A single run can unlock multiple milestones at once.

Each milestone can only be unlocked once per season.

---

## Seasons

- A season runs from **January 1 to December 31** each year
- Seasons are calculated automatically (no admin management needed)
- All milestones reset at the start of each season
- Members' runs only count from their **join date** (no retroactive awards)

---

## User Flows

### Onboarding

```
1. User opens app (s40g.app or similar)
2. Taps "Sign in with Strava"
3. Redirected to Strava OAuth consent screen
4. Authorizes the app
5. Redirected back to S40G
6. Profile created using Strava athlete data (ID, name, photo)
7. Prompted to "Add to Home Screen" for best experience
8. Lands on activity feed
```

### Run Completion

```
1. Member completes a run (tracked in Strava)
2. Strava sends webhook to S40G
3. App fetches activity streams (time + distance arrays) from Strava API
4. App runs sliding window algorithm to find best segment times for each milestone distance
5. App checks: Was any milestone distance covered in ≤ target time?
6. If yes: Award milestone(s), add to activity feed
7. Other members see achievement in feed
8. Members can add reactions
```

### Browsing

```
1. Member opens app
2. Default view: Activity feed (latest achievements)
3. Can navigate to:
   - Leaderboard (group progress)
   - Profile (own milestones)
```

---

## Information Architecture

```
S40G
├── Activity Feed (default/home)
│   └── List of recent achievements with reactions
├── Leaderboard
│   └── All members ranked by milestones unlocked
└── Profile
    └── Own milestone progress (unlocked/locked states)
```

---

## Technical Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel |
| Styling | Tailwind CSS |
| Auth | Strava OAuth 2.0 |
| Real-time | Supabase Realtime |

### System Diagram

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Strava    │──────│   S40G      │──────│  Supabase   │
│   API       │      │   (Vercel)  │      │  Database   │
└─────────────┘      └─────────────┘      └─────────────┘
       │                    │                    │
       │ Webhook            │ Next.js            │ Postgres
       │ (activity data)    │ API Routes         │ + Realtime
       │                    │                    │
       └────────────────────┴────────────────────┘
```

### Strava Integration

**OAuth Scopes Required:**
- `read` - Read public profile
- `activity:read` - Read activity data

**Webhook Events:**
- `activity.create` - New activity completed

**Data Retrieved:**

*Athlete:*
- ID, name, profile picture

*Activity (via webhook):*
- Activity ID, type (filter for "Run")

*Activity Streams (fetched after webhook):*
- `time` - Array of elapsed seconds at each data point
- `distance` - Array of cumulative distance (meters) at each data point

**Best Effort Calculation:**

Rather than relying on Strava's predefined best effort distances, S40G calculates its own using a sliding window algorithm on the activity streams. This allows us to detect achievements at any distance (including 2km and 7.5km which Strava doesn't natively support).

```
Algorithm: Find fastest segment of target distance

Input: time[], distance[], targetDistance
Output: bestTime (or null if distance not covered)

For each point i in distance[]:
  Find earliest point j where distance[i] - distance[j] >= targetDistance
  segmentTime = time[i] - time[j]
  bestTime = min(bestTime, segmentTime)

Return bestTime
```

This approach:
- Works for any arbitrary distance
- Detects fast segments within longer runs
- Matches how Strava calculates their own best efforts

---

## Data Models

### Member

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| strava_athlete_id | String | Strava's athlete ID |
| name | String | From Strava profile |
| profile_photo_url | String | From Strava profile |
| joined_at | Timestamp | When they connected Strava |
| created_at | Timestamp | Record creation |

### Achievement

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| member_id | UUID | FK to Member |
| milestone | Enum | 1km, 2km, 5km, 7.5km, 10km |
| season | Integer | Year (e.g., 2026) |
| strava_activity_id | String | Reference to the qualifying run |
| achieved_at | Timestamp | When the run occurred |
| distance | Float | Actual distance run (meters) |
| time | Integer | Actual time (seconds) |
| created_at | Timestamp | Record creation |

### Reaction

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| achievement_id | UUID | FK to Achievement |
| member_id | UUID | FK to Member (who reacted) |
| emoji | String | The reaction emoji |
| created_at | Timestamp | Record creation |

---

## API Endpoints

### Authentication
- `GET /api/auth/strava` - Initiate Strava OAuth
- `GET /api/auth/strava/callback` - Handle OAuth callback

### Webhooks
- `POST /api/webhooks/strava` - Receive Strava activity events, fetch streams, calculate achievements

### Data
- `GET /api/feed` - Get activity feed (paginated)
- `GET /api/leaderboard` - Get current season leaderboard
- `GET /api/profile` - Get current user's milestone progress
- `POST /api/reactions` - Add reaction to achievement
- `DELETE /api/reactions/:id` - Remove reaction

---

## UI/UX Requirements

### Design Principles
- Mobile-first, responsive
- Fast, minimal taps to core actions
- Celebratory feel when milestones are hit
- Clear visual distinction between locked/unlocked milestones

### Key Screens

**Activity Feed**
- Card-based list
- Each card shows: member photo, name, milestone, actual time, timestamp
- Reaction buttons below each card
- Pull to refresh

**Leaderboard**
- Ranked list of all members
- Show milestone progress as icons (filled = unlocked)
- Current user highlighted

**Profile**
- User's own milestone grid
- Locked milestones shown greyed out with target time
- Unlocked milestones show actual achieved time

### PWA Requirements
- Service worker for offline viewing
- Web app manifest with S40G icon
- Add to home screen prompt
- Theme color matching brand

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Members onboarded | 100% of running group |
| Weekly active users | >80% of members |
| Milestones unlocked (season) | Increasing trend |
| Reactions per achievement | >2 average |

---

## Open Questions

1. What emoji set for reactions? (Suggest: 🎉 🔥 💪 👏)
2. App icon design - who's creating it?
3. Domain name - s40g.app? sub40gang.com?
4. Do we need an admin view, or is the group self-managing?

---

## Timeline Estimate

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Setup | 1 week | Project scaffold, Strava OAuth working |
| Core | 2 weeks | Milestone tracking, database, webhooks |
| Social | 1 week | Feed, leaderboard, reactions |
| Polish | 1 week | PWA setup, UI refinement, testing |
| **Total** | **5 weeks** | MVP ready for group |

---

## Appendix

### Strava Webhook Setup

Strava requires a verification endpoint before sending webhooks:

1. Create `GET /api/webhooks/strava` that echoes back `hub.challenge`
2. Register subscription via Strava API
3. Implement `POST /api/webhooks/strava` to handle events

### Activity Streams Fetching

After receiving a webhook for a new activity:

```
GET https://www.strava.com/api/v3/activities/{id}/streams?keys=time,distance&key_by_type=true
```

Returns:
```json
{
  "time": {
    "data": [0, 1, 2, 3, ...],
    "series_type": "distance",
    "resolution": "high"
  },
  "distance": {
    "data": [0, 2.8, 5.9, 9.2, ...],
    "series_type": "distance",
    "resolution": "high"
  }
}
```

### Sliding Window Algorithm (Pseudocode)

```javascript
function findBestEffort(timeStream, distanceStream, targetDistance) {
  let bestTime = Infinity;
  let j = 0;
  
  for (let i = 0; i < distanceStream.length; i++) {
    // Move j forward until we have at least targetDistance
    while (j < distanceStream.length && 
           distanceStream[j] - distanceStream[i] < targetDistance) {
      j++;
    }
    
    // If we found a valid segment
    if (j < distanceStream.length) {
      const segmentTime = timeStream[j] - timeStream[i];
      bestTime = Math.min(bestTime, segmentTime);
    }
  }
  
  return bestTime === Infinity ? null : bestTime;
}
```

### Milestone Calculation Reference

| Milestone | Distance (m) | Target Time (s) |
|-----------|--------------|-----------------|
| 1km | 1000 | 240 |
| 2km | 2000 | 480 |
| 5km | 5000 | 1200 |
| 7.5km | 7500 | 1800 |
| 10km | 10000 | 2400 |
