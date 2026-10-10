import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/ingest/issues/route';
import type { Db } from '@/db/client';
import { issues } from '@/db/schema';
import type { IssueInput } from '@/lib/ingest/issues';
import { createTestDb } from './helpers/db';

const token = 'test-token';

function issue(overrides: Partial<IssueInput> = {}): IssueInput {
  return {
    slug: 'week-2026-10-05',
    title: 'Week of 5 Oct 2026',
    theme_line: 'A theme',
    published_at: '2026-10-05T00:00:00.000Z',
    body_markdown: '# Hello\n\nA letter.',
    status: 'draft',
    ...overrides,
  };
}

async function post(body: unknown, authorization = `Bearer ${token}`): Promise<Response> {
  return POST(
    new Request('http://localhost/api/ingest/issues', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization },
      body: JSON.stringify(body),
    }),
  );
}

describe('issue ingest', () => {
  let db: Db;

  beforeAll(async () => {
    process.env.AI_WIRE_INGEST_TOKEN = token;
    db = await createTestDb();
  });

  beforeEach(async () => {
    await db.delete(issues);
  });

  it('upserts by slug and leaves an identical draft unchanged', async () => {
    const created = await post(issue());
    expect(created.status).toBe(200);
    expect(await created.json()).toEqual({ created: 1, upserted: 0, keys: ['week-2026-10-05'] });

    await db
      .update(issues)
      .set({ updatedAt: new Date('2020-01-01T00:00:00.000Z') })
      .where(eq(issues.slug, 'week-2026-10-05'));

    const again = await post(issue());
    expect(await again.json()).toEqual({ created: 0, upserted: 1, keys: ['week-2026-10-05'] });
    const rows = await db.select().from(issues);
    expect(rows[0]?.updatedAt.toISOString()).toBe('2020-01-01T00:00:00.000Z');
    expect(rows[0]?.status).toBe('draft');
  });

  it('rejects an unknown status', async () => {
    const response = await post({ ...issue(), status: 'scheduled' });
    expect(response.status).toBe(400);
    expect(await db.select().from(issues)).toHaveLength(0);
  });

  it('does not revert a published issue to draft', async () => {
    await post(issue({ status: 'published' }));
    const response = await post(issue({ status: 'draft', title: 'Changed' }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { errors: Array<{ slug?: string; messages: string[] }> };
    expect(body.errors[0]?.slug).toBe('week-2026-10-05');
    expect(body.errors[0]?.messages[0]).toMatch(/cannot be reverted/);
    const rows = await db.select().from(issues);
    expect(rows[0]?.status).toBe('published');
    expect(rows[0]?.title).toBe('Week of 5 Oct 2026');
  });
});
