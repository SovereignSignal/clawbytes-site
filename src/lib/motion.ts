/** Scroll shift for the shore backdrop. Reduced motion keeps the scene still. */
export function parallaxShift(scrollY: number, reduce: boolean): number {
  if (reduce) return 0;
  const y = Number.isFinite(scrollY) ? Math.max(scrollY, 0) : 0;
  return Math.min(y, 1200) * 0.12;
}
