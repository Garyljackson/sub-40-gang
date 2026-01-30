# Workout Proposals UI Sample

This folder contains a UI sample implementation for the Workout Proposals feature. The sample is fully functional with mocked data.

## Expanded Repeats Layout

**Design Philosophy:** Repeat contents are always visible as nested segment boxes - no clicking required.

**Visual Characteristics:**

- Repeat segments display their contents as colored boxes
- Nested structure is immediately visible
- Flexible wrap layout for segments
- Clear visual hierarchy with indentation
- Fully interactive workout builder with nested repeat support

```
┌─────────────────────────────────────────────────┐
│ [Warmup]  ┌─────────────────────┐  [Cooldown]   │
│           │ 5×  repeat          │               │
│           │ ┌────────┐ ┌──────┐ │               │
│           │ │800m @  │ │ 90s  │ │               │
│           │ │ Hard   │ │ rest │ │               │
│           │ └────────┘ └──────┘ │               │
│           └─────────────────────┘               │
└─────────────────────────────────────────────────┘
```

---

## Shared Infrastructure

The sample uses common code in the `shared/` folder:

| File            | Purpose                                            |
| --------------- | -------------------------------------------------- |
| `types.ts`      | TypeScript types for workouts, proposals, segments |
| `constants.ts`  | Pace ranges, segment colors, voting period         |
| `mock-data.ts`  | 4 sample proposals + 2 archived workouts           |
| `utils.ts`      | Formatting functions (duration, distance, time)    |
| `use-voting.ts` | React hook for vote state management               |

### Mock Data

The sample includes:

- **4 Current Proposals:**
  - 5x800m Intervals (3 votes, leading)
  - 20min Tempo Run (2 votes)
  - Pyramid Session (1 vote)
  - Nested 400s (0 votes)

- **2 Archived Workouts:**
  - 6x400m Fast Finish (previous week)
  - Hill Repeats (2 weeks ago)

- **Current User:** Diana Lee (has voted for proposal 1)

### Segment Types & Colors

| Type     | Color              | Example                       |
| -------- | ------------------ | ----------------------------- |
| Warmup   | Light Blue         | `bg-blue-200`                 |
| Run      | Intensity gradient | Green → Yellow → Orange → Red |
| Rest     | Gray               | `bg-gray-300`                 |
| Cooldown | Light Purple       | `bg-purple-200`               |
| Repeat   | Dashed border      | Contains nested segments      |

---

## Usage

This is a standalone React component that can be imported directly:

```tsx
// app/workouts/page.tsx
export { default } from '@/documents/features/workout-proposals/samples/sample-5-expanded-repeats/page';
```

---

## Key Features

- **Vote swapping** - One vote per user, can change selection
- **Sorted by votes** - Proposals ordered by vote count
- **Builder preview** - Real-time workout visualization
- **Nested repeats** - Add repeats inside repeats for complex workout structures

### Accessibility Considerations

- Touch targets minimum 44px
- Sufficient color contrast
- Interactive elements clearly indicated
