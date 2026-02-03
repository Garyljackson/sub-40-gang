export const BRISBANE_TIMEZONE = 'Australia/Brisbane';

/**
 * Get the season (year) for a given date in Brisbane time
 * Seasons run January 1 - December 31 in Brisbane timezone
 */
export function getSeasonForDate(date: Date): number {
  const brisbaneDate = new Date(date.toLocaleString('en-US', { timeZone: BRISBANE_TIMEZONE }));
  return brisbaneDate.getFullYear();
}

/**
 * Get the current season (year) in Brisbane time
 */
export function getCurrentSeason(): number {
  return getSeasonForDate(new Date());
}

/**
 * Convert a date to Brisbane timezone ISO string
 */
export function toBrisbaneISO(date: Date): string {
  return date.toLocaleString('sv-SE', { timeZone: BRISBANE_TIMEZONE }).replace(' ', 'T');
}

/**
 * Get the start of a season (Jan 1 00:00:00 Brisbane time) as UTC Date
 */
export function getSeasonStart(season: number): Date {
  // Create date at start of year in Brisbane
  const brisbaneStart = new Date(`${season}-01-01T00:00:00+10:00`);
  return brisbaneStart;
}

/**
 * Get the end of a season (Dec 31 23:59:59 Brisbane time) as UTC Date
 */
export function getSeasonEnd(season: number): Date {
  // Brisbane is UTC+10, so Dec 31 23:59:59 Brisbane = Dec 31 13:59:59 UTC
  const brisbaneEnd = new Date(`${season}-12-31T23:59:59+10:00`);
  return brisbaneEnd;
}

// =============================================================================
// Workout Proposals - Voting Period Helpers
// =============================================================================

/**
 * Get the Wednesday date for the current voting period
 *
 * Voting period runs Thursday 6:00 AM to Wednesday 5:59 AM Brisbane time.
 * We're always voting for the upcoming Wednesday's workout.
 *
 * Examples (Brisbane time):
 * - Thursday 6:00 AM → voting for next Wednesday
 * - Friday → voting for next Wednesday
 * - Monday → voting for this Wednesday
 * - Wednesday 5:59 AM → still voting for today
 * - Wednesday 6:00 AM → new period, voting for next Wednesday
 *
 * @returns YYYY-MM-DD format string for the Wednesday date
 */
export function getCurrentVotingWednesday(): string {
  const now = new Date();

  // Get current time in Brisbane
  const brisbaneStr = now.toLocaleString('en-US', {
    timeZone: BRISBANE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Parse Brisbane time components
  const match = brisbaneStr.match(/(\d+)\/(\d+)\/(\d+),\s*(\d+):(\d+)/);
  if (!match) {
    throw new Error('Failed to parse Brisbane time');
  }

  const [, month, day, year, hour] = match;
  const brisbaneDate = new Date(
    parseInt(year!),
    parseInt(month!) - 1,
    parseInt(day!),
    parseInt(hour!)
  );

  const dayOfWeek = brisbaneDate.getDay(); // 0=Sun, 1=Mon, ..., 3=Wed, 4=Thu
  const currentHour = parseInt(hour!);

  // Calculate days until next Wednesday
  let daysUntilWed: number;

  if (dayOfWeek === 3) {
    // Wednesday
    if (currentHour < 6) {
      // Before 6am: still voting for today
      daysUntilWed = 0;
    } else {
      // 6am or later: new period, voting for next Wednesday
      daysUntilWed = 7;
    }
  } else if (dayOfWeek === 4) {
    // Thursday
    if (currentHour < 6) {
      // Before 6am: still in previous period (yesterday was Wed)
      daysUntilWed = -1;
    } else {
      // 6am or later: new period started, voting for next Wednesday
      daysUntilWed = 6;
    }
  } else if (dayOfWeek > 4) {
    // Friday (5), Saturday (6)
    daysUntilWed = 3 + (7 - dayOfWeek); // Days until Wed
  } else {
    // Sunday (0), Monday (1), Tuesday (2)
    daysUntilWed = 3 - dayOfWeek;
  }

  // Calculate target Wednesday
  const targetDate = new Date(brisbaneDate);
  targetDate.setDate(targetDate.getDate() + daysUntilWed);

  // Format as YYYY-MM-DD
  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

/**
 * Get the Wednesday date for the voting period that just ended
 *
 * Used by the archive cron job which runs at 6:00 AM Wednesday Brisbane time.
 * At that moment, getCurrentVotingWednesday() returns NEXT Wednesday,
 * but we need to archive the period that just ended (today's Wednesday).
 *
 * @returns YYYY-MM-DD format string for the Wednesday that just ended
 */
export function getPreviousVotingWednesday(): string {
  const now = new Date();

  // Get current time in Brisbane
  const brisbaneStr = now.toLocaleString('en-US', {
    timeZone: BRISBANE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Parse Brisbane time components
  const match = brisbaneStr.match(/(\d+)\/(\d+)\/(\d+),\s*(\d+):(\d+)/);
  if (!match) {
    throw new Error('Failed to parse Brisbane time');
  }

  const [, month, day, year, hour] = match;
  const brisbaneDate = new Date(
    parseInt(year!),
    parseInt(month!) - 1,
    parseInt(day!),
    parseInt(hour!)
  );

  const dayOfWeek = brisbaneDate.getDay(); // 0=Sun, 1=Mon, ..., 3=Wed, 4=Thu
  const currentHour = parseInt(hour!);

  // Calculate days to the most recent Wednesday that ended its voting period
  let daysToLastWed: number;

  if (dayOfWeek === 3) {
    // Wednesday
    if (currentHour >= 6) {
      // 6am or later: today's period just ended
      daysToLastWed = 0;
    } else {
      // Before 6am: today hasn't ended yet, go back to last Wednesday
      daysToLastWed = -7;
    }
  } else if (dayOfWeek === 4) {
    // Thursday
    if (currentHour >= 6) {
      // New period started, yesterday (Wed) just ended
      daysToLastWed = -1;
    } else {
      // Before 6am Thu: still in Wed's period, last ended Wed was a week ago
      daysToLastWed = -8;
    }
  } else if (dayOfWeek > 4) {
    // Friday (5), Saturday (6) - last Wed was (dayOfWeek - 3) days ago
    daysToLastWed = -(dayOfWeek - 3);
  } else {
    // Sunday (0), Monday (1), Tuesday (2) - last Wed was (dayOfWeek + 4) days ago
    daysToLastWed = -(dayOfWeek + 4);
  }

  // Calculate target Wednesday
  const targetDate = new Date(brisbaneDate);
  targetDate.setDate(targetDate.getDate() + daysToLastWed);

  // Format as YYYY-MM-DD
  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

/**
 * Format a Wednesday date for display
 * @param dateStr - YYYY-MM-DD format date string
 * @returns Formatted string like "Wednesday, Feb 4th"
 */
export function formatWednesdayDate(dateStr: string): string {
  // Parse as Brisbane date (noon to avoid DST issues)
  const date = new Date(`${dateStr}T12:00:00+10:00`);

  const dayNum = date.getDate();
  const suffix = getDaySuffix(dayNum);

  const month = date.toLocaleDateString('en-AU', {
    month: 'short',
    timeZone: BRISBANE_TIMEZONE,
  });

  return `Wednesday, ${month} ${dayNum}${suffix}`;
}

/**
 * Get ordinal suffix for a day number
 */
function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/**
 * Format a date for archive display (e.g., "Week of Jan 28, 2026")
 */
export function formatArchiveWeekDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00+10:00`);

  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: BRISBANE_TIMEZONE,
  });
}
