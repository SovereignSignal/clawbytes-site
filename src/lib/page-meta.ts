import type { Metadata } from 'next';
import { brand } from '@/config/brand';

/** Page metadata with a canonical path. Keeps the items RSS alternate, which a page-level `alternates` object would otherwise replace. */
export function pageMetadata(path: string, metadata: Metadata = {}): Metadata {
  return {
    ...metadata,
    alternates: {
      canonical: path,
      types: {
        'application/rss+xml': [{ url: '/feed.xml', title: brand.name }],
      },
    },
  };
}
