import { getDb } from '@/db/client';
import { isAuthorized } from '@/lib/auth';
import { readMetrics } from '@/lib/metrics/read';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const headers = { 'cache-control': 'no-store, max-age=0' };

export async function GET(req: Request): Promise<Response> {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers });
  }
  try {
    return Response.json(await readMetrics(getDb()), { status: 200, headers });
  } catch (error) {
    console.error('[ai-wire] metrics read failed:', error);
    return Response.json({ error: 'metrics failed' }, { status: 500, headers });
  }
}
