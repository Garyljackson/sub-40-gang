# Weekly Workout Proposals - Feature Specification

## Overview

A collaborative feature allowing S40G members to propose, vote on, and select the group's Wednesday run workout each week. Members build structured workouts using a visual builder, vote for their favorite proposal, and the winning workout is archived for future reference.

---

## Goals

### User Goals

- Collaborate on weekly workout selection as a group
- Discover new workout ideas from other members
- Build structured, shareable workout plans easily
- Reference past winning workouts for inspiration

### Product Goals

- Increase engagement between Wednesday runs
- Add collaborative decision-making to complement individual achievement tracking
- Create a library of group-tested workouts over time

---

## Feature Summary

| Aspect       | Decision                                              |
| ------------ | ----------------------------------------------------- |
| Voting       | Upvote only, one vote per member per week (swappable) |
| Vote Display | Count only (no voter names shown)                     |
| Proposals    | Unlimited per member per week                         |
| Edit/Delete  | Authors have full control until weekly reset          |
| History      | Searchable archive of past winning workouts           |
| Reuse        | Clone feature to re-propose past workouts             |
| Reset        | Every Wednesday at 6:00 AM Brisbane time              |
| Navigation   | New 4th tab in main navigation                        |

---

## Voting Mechanics

### Rules

1. Each member can cast **one vote per week**
2. Voting is **upvote only** (no downvotes)
3. If a member votes for a different proposal, their vote **transfers** to the new selection
4. Only the **vote count** is displayed (not who voted)
5. Proposals are **sorted by vote count** (highest first), then by submission time

### Lifecycle

```
Thursday 6:00 AM Brisbane → New voting period begins
                          → Previous week's winner archived
                          → All proposals cleared
                          → Members can propose new workouts

Wednesday 5:59 AM Brisbane → Voting closes
                           → Top-voted workout is the "winner"

Wednesday 6:00 AM Brisbane → Reset occurs
```

---

## Workout Builder

### Segment Types

#### Run

Primary activity segment for running intervals.

| Field                | Type   | Required | Options                                            |
| -------------------- | ------ | -------- | -------------------------------------------------- |
| Distance OR Duration | Choice | Yes      | Distance-based (meters/km) OR time-based (minutes) |
| Pace                 | Select | Optional | Predefined pace ranges (see below)                 |

**Pace Range Options:**

- Recovery: 7:00+/km
- Easy: 6:00-7:00/km
- Moderate: 5:30-6:00/km
- Tempo: 5:00-5:30/km
- Threshold: 4:30-5:00/km
- Hard: 4:00-4:30/km
- Sprint: <4:00/km

#### Rest

Recovery period between efforts.

| Field    | Type   | Required | Options                                    |
| -------- | ------ | -------- | ------------------------------------------ |
| Duration | Number | Yes      | Seconds or minutes                         |
| Type     | Select | Yes      | Standing rest, Walking, Active (light jog) |

#### Warmup

Opening segment (optional by default, included in new workouts but removable). No configurable options - just indicates a warmup period.

#### Cooldown

Closing segment (optional by default, included in new workouts but removable). No configurable options - just indicates a cooldown period.

#### Repeats

Container for repeating a set of segments multiple times. Supports nesting for complex workout structures.

| Field        | Type   | Required | Options                              |
| ------------ | ------ | -------- | ------------------------------------ |
| Repeat Count | Number | Yes      | How many times to repeat             |
| Segments     | Array  | Yes      | Nested Run, Rest, or Repeat segments |

**Example of nested repeats:**

```
3× [
  2× [
    400m @ Hard
    200m @ Easy
  ]
  3 min standing rest
]
```

### Workout Metadata

| Field          | Type | Required | Constraints                                                                                   |
| -------------- | ---- | -------- | --------------------------------------------------------------------------------------------- |
| Name           | Text | Yes      | Max 50 characters                                                                             |
| Wednesday Date | Date | Auto     | The Wednesday this workout is proposed for (set automatically based on current voting period) |
| Notes          | Text | Optional | Max 500 characters, general instructions/context                                              |

### Builder UX

- Drag-and-drop segment ordering
- Visual preview updates in real-time
- New workouts start with Warmup and Cooldown pre-added (can be removed)
- Validation prevents saving empty or invalid workouts
- "Clone" button available on archived workouts

---

## Display Format

### Visual Timeline

- Horizontal bar/block representation
- Color-coded by segment type:
  - Warmup: Light blue
  - Run: Intensity-based gradient (green → yellow → orange → red)
  - Rest: Gray
  - Cooldown: Light purple
- Segment width proportional to duration/distance
- Repeat groups visually bracketed
- Tapping a segment shows its details (distance/duration, pace, rest type)

---

## Proposals List

### Display Elements

Each proposal card shows:

- **Workout name**
- **Proposer** (avatar + name)
- **Visual timeline** (interactive - tap segments for details)
- **Vote count**
- **Vote button** (highlighted if user's current vote)

### Sorting

1. Vote count (descending)
2. Submission time (ascending) for ties

### Actions

- **Vote/Unvote** - Toggle vote on a proposal
- **Edit** - (Own proposals only) Modify workout
- **Delete** - (Own proposals only) Remove proposal

---

## Archive

### Access

- Dedicated "History" or "Past Workouts" section within the Workouts tab
- Searchable by workout name
- Filterable by date range

### Display

- List of past winning workouts by week
- Each entry shows:
  - Week ending date
  - Workout name
  - Proposer
  - Final vote count
  - Visual timeline (interactive - tap segments for details)

### Clone Feature

- "Propose Again" button on any archived workout
- Creates a new proposal pre-filled with the workout details
- Proposer becomes the member who cloned it
- Can be edited before or after submitting

---

## Navigation

Add **4th tab** to main navigation:

```
S40G
├── Feed (existing)
├── Leaderboard (existing)
├── Workouts (NEW)
│   ├── Current Proposals (default view)
│   ├── Workout Builder (via + button)
│   └── History/Archive
└── Profile (existing)
```

### Tab Icon Suggestions

- Running shoe
- Clipboard with checkmark
- Calendar with running figure

---

## User Flows

### Proposing a Workout

```
1. Member taps Workouts tab
2. Taps "+" or "Propose Workout" button
3. Workout builder opens with Warmup + Cooldown pre-added
4. Member adds/removes/reorders segments
5. Member adds workout name (required) and notes (optional)
6. Real-time visual preview shows workout structure
7. Member taps "Submit Proposal"
8. Proposal appears in list, sorted by votes
```

### Voting

```
1. Member views proposals list
2. Taps vote button on preferred workout
3. Vote count increments, button shows "Voted"
4. If member votes on different proposal later:
   - Previous vote removed (count decrements)
   - New vote applied (count increments)
```

### Cloning from Archive

```
1. Member navigates to History section
2. Browses or searches past workouts
3. Taps "Propose Again" on desired workout
4. Workout builder opens with all fields pre-filled
5. Member can edit if desired
6. Submits as new proposal for current week
```

---

## Technical Considerations

### New Database Tables

- `workouts` - Workout definitions (segments stored as JSON)
- `workout_proposals` - Links workout to a week, tracks proposer
- `workout_votes` - Member votes (one per member per week)

### Cron Job

- Weekly reset job at 6:00 AM Brisbane every Wednesday
- Archives winning workout
- Clears proposals table for new week
- Could use Vercel Cron similar to existing queue processor

### Data Model (Conceptual)

```typescript
interface Workout {
  id: string;
  name: string;
  wednesday_date: Date; // The Wednesday this workout is for
  notes?: string;
  segments: Segment[];
  created_by: string; // member_id
  created_at: Date;
}

type Segment = WarmupSegment | RunSegment | RestSegment | CooldownSegment | RepeatSegment;

interface WarmupSegment {
  type: 'warmup';
}

interface CooldownSegment {
  type: 'cooldown';
}

interface RunSegment {
  type: 'run';
  distance_meters?: number;
  duration_seconds?: number;
  pace_range?: PaceRange;
}

interface RestSegment {
  type: 'rest';
  duration_seconds: number;
  rest_type: 'standing' | 'walking' | 'active';
}

interface RepeatSegment {
  type: 'repeat';
  count: number;
  segments: (RunSegment | RestSegment | RepeatSegment)[]; // Supports nesting
}

type PaceRange = 'recovery' | 'easy' | 'moderate' | 'tempo' | 'threshold' | 'hard' | 'sprint';
```

---

## Edge Cases

| Scenario                          | Behavior                                              |
| --------------------------------- | ----------------------------------------------------- |
| No proposals for the week         | Show empty state with prompt to propose first workout |
| Tie in votes                      | Both shown at top, sorted by submission time          |
| Proposal deleted after votes cast | Votes are removed, voters can vote again              |
| Edited proposal                   | Votes remain (minor edits shouldn't invalidate votes) |
| Reset with no votes               | No winner archived for that week                      |
| Member joins mid-week             | Can vote and propose immediately                      |

---

## Open Questions

1. Should winning workouts integrate with Strava somehow (e.g., as a route/workout export)?
2. What happens if the proposer of the winning workout leaves the group?

---

## Future Considerations (v2+)

- Comments/discussion on proposals
- Push notifications when new workouts proposed or voting closes
- Workout difficulty rating based on segment analysis
- Integration with Strava workout export
- "My Workouts" section for personal saved templates
- Workout completion tracking (did members actually do it?)
