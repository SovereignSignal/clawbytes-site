import { revalidatePath } from 'next/cache';

const ITEM_PATHS = ['/', '/archive', '/models', '/tools', '/repos', '/search', '/feed.xml'];

export function revalidateItems(): void {
  for (const path of ITEM_PATHS) {
    try {
      revalidatePath(path);
    } catch (err) {
      console.warn('[ai-wire] revalidate failed for', path, err);
    }
  }
}

/** Issue pages redirect to Substack, so there is no on-site issues feed to refresh. */
export function revalidateIssues(_slug?: string): void {}
