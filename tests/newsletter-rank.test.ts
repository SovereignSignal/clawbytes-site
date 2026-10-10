import { describe, expect, it } from 'vitest';
import { rankItems, sectionIdsFor } from '@/lib/newsletter/rank';
import { weekWindow } from '@/lib/newsletter/week';
import { rankable } from './helpers/item';

describe('newsletter ranker', () => {
  it('puts multi-bot items ahead of a higher single-bot score', () => {
    const ranked = rankItems([
      rankable({
        canonicalKey: 'repo:acme/widget',
        title: 'widget',
        url: 'https://example.com/widget',
        kind: 'repo',
        score: 100,
        appearances: [{ sourceBot: 'interesting-repos' }],
      }),
      rankable({
        score: 1,
        appearances: [{ sourceBot: 'modelbytes' }, { sourceBot: 'clawbytes' }],
      }),
    ]);
    expect(ranked.map((item) => item.canonicalKey)).toEqual([
      'model:anthropic/claude-haiku-5.5',
      'repo:acme/widget',
    ]);
  });

  it('uses score, then appearance count, inside the same bot count', () => {
    const ranked = rankItems([
      rankable({ canonicalKey: 'model:a/one', score: 2, appearances: [{ sourceBot: 'modelbytes' }] }),
      rankable({
        canonicalKey: 'model:a/two',
        score: 2,
        appearances: [{ sourceBot: 'modelbytes' }, { sourceBot: 'modelbytes' }],
      }),
      rankable({ canonicalKey: 'model:a/three', score: 9, appearances: [{ sourceBot: 'modelbytes' }] }),
    ]);
    expect(ranked.map((item) => item.canonicalKey)).toEqual(['model:a/three', 'model:a/two', 'model:a/one']);
  });

  it('maps items onto the public wire sections', () => {
    expect(sectionIdsFor(rankable({ kind: 'model', appearances: [{ sourceBot: 'modelbytes' }, { sourceBot: 'clawbytes' }] }))).toEqual([
      'tools',
      'models',
    ]);
    expect(sectionIdsFor(rankable({ kind: 'tool_release', appearances: [{ sourceBot: 'release-bot' }] }))).toEqual(['tools']);
    expect(sectionIdsFor(rankable({ kind: 'repo', appearances: [{ sourceBot: 'interesting-repos' }] }))).toEqual(['repos']);
  });

  it('snaps a date to the Monday of its UTC week', () => {
    expect(weekWindow('2026-10-10').startDate).toBe('2026-10-05');
    expect(weekWindow('2026-10-05').slug).toBe('week-2026-10-05');
    expect(weekWindow('2026-10-11').end.toISOString()).toBe('2026-10-12T00:00:00.000Z');
    expect(() => weekWindow('10-05-2026')).toThrow(/YYYY-MM-DD/);
  });
});
