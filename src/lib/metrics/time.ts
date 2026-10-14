const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** UTC calendar day, `YYYY-MM-DD`. */
export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function shiftUtcDay(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return utcDay(date);
}

/** Half-open UTC interval `[start, end)` for a calendar day. */
export function utcDayRange(day: string): { start: Date; end: Date } {
  const start = new Date(`${day}T00:00:00.000Z`);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/** Stale when there is no ingest, or the last one is at least `hours` old. */
export function ingestIsStale(lastIngestAt: Date | null, now: Date, hours: number): boolean {
  if (!lastIngestAt) return true;
  return now.getTime() - lastIngestAt.getTime() >= hours * HOUR_MS;
}

export function asDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function asDay(value: unknown): string {
  if (value instanceof Date) return utcDay(value);
  const text = String(value ?? '');
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(text);
  return match?.[1] ?? text;
}

export function asCount(value: unknown): number {
  const count = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(count)) return 0;
  return Math.trunc(count);
}
