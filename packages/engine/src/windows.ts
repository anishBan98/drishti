// Analysis windows (docs/08-METHODS.md §1). All dates are YYYY-MM-DD (IST calendar days).

export type Range = [string, string];

const DAY = 86_400_000;
const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDays(d: string, n: number): string {
  return toIso(toMs(d) + n * DAY);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toMs(to) - toMs(from)) / DAY);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(d: string): number {
  return new Date(toMs(d)).getUTCDay();
}

export function inRange(d: string, [from, to]: Range): boolean {
  return d >= from && d <= to;
}

export interface Windows {
  today: string;
  week: Range;
  prior_week: Range;
  d28: Range;
  prior_d28: Range;
  d90: Range;
  d30: Range;
  prior_d30: Range;
  d365: Range;
}

/**
 * "This week" = the last complete week (Monday to Sunday by default) ending before today.
 * "Last 28 days" = the 28 complete days ending yesterday; prior windows are the same length immediately before.
 */
export function windowsFor(today: string, weekStartsOn: 'monday' | 'sunday' = 'monday'): Windows {
  const yesterday = addDays(today, -1);
  const lastDay = weekStartsOn === 'monday' ? 0 : 6; // week ends on Sunday (0) or Saturday (6)
  let end = yesterday;
  while (weekday(end) !== lastDay) end = addDays(end, -1);
  const back = (to: string, days: number): Range => [addDays(to, -(days - 1)), to];
  const week = back(end, 7);
  const d28 = back(yesterday, 28);
  const d30 = back(yesterday, 30);
  return {
    today,
    week,
    prior_week: back(addDays(week[0], -1), 7),
    d28,
    prior_d28: back(addDays(d28[0], -1), 28),
    d90: back(yesterday, 90),
    d30,
    prior_d30: back(addDays(d30[0], -1), 30),
    d365: back(yesterday, 365),
  };
}
