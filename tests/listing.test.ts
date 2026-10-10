import { describe, expect, it } from 'vitest';
import { listingHref } from '@/lib/listing';

describe('listing links', () => {
  it('keeps filters and omits page on the first page', () => {
    expect(listingHref('/tools', { lane: 'Ship' }, 1)).toBe('/tools?lane=Ship');
    expect(listingHref('/models', { lane: 'Tier 1', org: 'Anthropic' }, 2)).toBe(
      '/models?lane=Tier+1&org=Anthropic&page=2',
    );
    expect(listingHref('/search', { q: 'haiku', lane: undefined }, 3)).toBe('/search?q=haiku&page=3');
  });
});
