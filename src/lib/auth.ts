import { timingSafeEqual } from 'node:crypto';

/** Bearer token for every ingest route. Fails closed when the token is unset. */
export function isAuthorized(req: Request): boolean {
  const expected = process.env.AI_WIRE_INGEST_TOKEN;
  if (!expected) return false;
  const header = req.headers.get('authorization') ?? '';
  if (!header.startsWith('Bearer ')) return false;
  const got = Buffer.from(header.slice('Bearer '.length));
  const want = Buffer.from(expected);
  return got.length === want.length && timingSafeEqual(got, want);
}
