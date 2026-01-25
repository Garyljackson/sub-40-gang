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
