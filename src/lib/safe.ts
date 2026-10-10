/**
 * A failed read becomes an empty state instead of a crashed page.
 * Also lets `next build` finish when no database is reachable.
 */
export async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error('[ai-wire] query failed:', err);
    return fallback;
  }
}
