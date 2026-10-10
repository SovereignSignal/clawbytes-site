/** Sample rows stay off the public site in production unless SEED=1. */
export function includeSampleData(): boolean {
  if (process.env.SEED === '1') return true;
  return process.env.NODE_ENV !== 'production';
}
