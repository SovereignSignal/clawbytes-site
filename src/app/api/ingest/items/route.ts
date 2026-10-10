import { getDb } from '@/db/client';
import { isAuthorized } from '@/lib/auth';
import { applyItemBatch, parseItemBatch } from '@/lib/ingest/items';
import { revalidateItems } from '@/lib/revalidate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { errors: [{ index: null, messages: ['body is not valid JSON'] }] },
      { status: 400 },
    );
  }
  const parsed = parseItemBatch(body);
  if (!parsed.ok) {
    return Response.json({ errors: parsed.errors }, { status: 400 });
  }
  try {
    const result = parsed.items.length
      ? await applyItemBatch(getDb(), parsed.items)
      : { created: 0, upserted: 0, keys: [] as string[] };
    if (parsed.items.length) revalidateItems();
    return Response.json({
      upserted: result.upserted,
      created: result.created,
      keys: result.keys,
      ...(parsed.errors.length ? { errors: parsed.errors } : {}),
    });
  } catch (err) {
    console.error('[ai-wire] item ingest failed:', err);
    return Response.json({ error: 'ingest failed' }, { status: 500 });
  }
}
