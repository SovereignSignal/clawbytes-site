import { afterEach, describe, expect, it, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import IssuePage from '@/app/issues/[slug]/page';
import IssuesPage from '@/app/issues/page';
import { brand } from '@/config/brand';
import { revalidateIssues } from '@/lib/revalidate';

const SECTION = 'https://sovereignsignal.substack.com/s/clawbytes';

function redirectOf(error: unknown): { url: string; status: number } {
  const digest = (error as { digest?: string }).digest ?? '';
  expect(digest.startsWith('NEXT_REDIRECT;')).toBe(true);
  const parts = digest.split(';');
  return { url: parts.slice(2, -2).join(';'), status: Number(parts.at(-2)) };
}

describe('issue redirects', () => {
  afterEach(() => {
    delete process.env.SUBSTACK_DIGEST_URL;
  });

  it('sends /issues to the ClawBytes section', () => {
    let caught: unknown;
    try {
      IssuesPage();
    } catch (error) {
      caught = error;
    }
    expect(redirectOf(caught)).toEqual({ url: SECTION, status: 308 });
  });

  it('sends /issues/[slug] to the same section', async () => {
    let caught: unknown;
    try {
      await IssuePage({ params: Promise.resolve({ slug: 'week-2026-10-05' }) });
    } catch (error) {
      caught = error;
    }
    expect(redirectOf(caught)).toEqual({ url: brand.substackUrl, status: 308 });
  });

  it('follows SUBSTACK_DIGEST_URL', () => {
    process.env.SUBSTACK_DIGEST_URL = 'https://sovereignsignal.substack.com/s/other/';
    let caught: unknown;
    try {
      IssuesPage();
    } catch (error) {
      caught = error;
    }
    expect(redirectOf(caught).url).toBe('https://sovereignsignal.substack.com/s/other');
  });

  it('does not refresh an issues feed', () => {
    vi.mocked(revalidatePath).mockClear();
    revalidateIssues('week-2026-10-05');
    const paths = vi.mocked(revalidatePath).mock.calls.map((call) => call[0]);
    expect(paths).not.toContain('/issues');
    expect(paths).not.toContain('/issues/feed.xml');
    expect(paths).not.toContain('/issues/week-2026-10-05');
  });
});
