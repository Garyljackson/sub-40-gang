# S40G Task System

This directory contains the structured task breakdown for implementing the S40G project.

## How to Use

### For Claude Code

When working on S40G:

1. **Before starting work**, check `TASKS.md` for the current task status
2. **Find the next uncompleted task** (marked with `[ ]`) that has no blockers
3. **Work on the task** following the description and acceptance criteria
4. **Mark the task complete** by changing `[ ]` to `[x]` when finished
5. **Commit the updated TASKS.md** along with your implementation changes

### Task Format

Each task follows this format:

```markdown
- [ ] **Task Title**
  - Description of what needs to be done
  - Acceptance criteria or key requirements
```

### Task Status

- `[ ]` = Not started
- `[x]` = Completed

### Dependencies

Some tasks have dependencies indicated in their description. Complete prerequisite tasks before starting dependent ones.

## Files

- `TASKS.md` - Master task list with all implementation tasks organized by phase
- `README.md` - This file

## Phases Overview

1. **Project Setup** - Initialize Next.js project and configure tooling
2. **Database & Infrastructure** - Set up Supabase and create schema
3. **Strava Integration** - OAuth, webhooks, and activity processing
4. **Core Features** - Activity feed, leaderboard, and profile pages
5. **Social Features** - Reactions system
6. **PWA & Polish** - Progressive Web App setup and UI refinements
7. **Testing** - Unit, integration, and E2E tests
8. **Deployment** - Vercel deployment and production configuration
