const DAY = 24 * 60 * 60 * 1000;

export type WeekWindow = {
  /** Monday 00:00 UTC. */
  start: Date;
  /** The following Monday 00:00 UTC. */
  end: Date;
  slug: string;
  /** YYYY-MM-DD of the Monday. */
  startDate: string;
};

/** The ISO week (Monday–Sunday, UTC) that contains `yyyy-mm-dd`. */
export function weekWindow(input: string): WeekWindow {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (!match) throw new Error('week must be YYYY-MM-DD');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) throw new Error('week must be YYYY-MM-DD');
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('week must be a real calendar date');
  }
  const weekday = date.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const start = new Date(date.getTime() + mondayOffset * DAY);
  const end = new Date(start.getTime() + 7 * DAY);
  const startDate = start.toISOString().slice(0, 10);
  return { start, end, slug: `week-${startDate}`, startDate };
}

export function inWindow(date: Date | null | undefined, window: WeekWindow): boolean {
  if (!date) return false;
  const time = date.getTime();
  return time >= window.start.getTime() && time < window.end.getTime();
}
