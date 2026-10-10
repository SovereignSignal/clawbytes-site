import { revalidatePath } from 'next/cache';

const ITEM_PATHS = ['/', '/archive', '/models', '/tools', '/repos', '/search', '/feed.xml'];
const ISSUE_PATHS = ['/', '/issues', '/issues/feed.xml'];

export function revalidateItems(): void {
  for (const path of ITEM_PATHS) {
    try {
      revalidatePath(path);
    } catch (err) {
      console.warn('[ai-wire] revalidate failed for', path, err);
    }
  }
}

export function revalidateIssues(slug?: string): void {
  const paths = slug ? [...ISSUE_PATHS, `/issues/${slug}`] : ISSUE_PATHS;
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (err) {
      console.warn('[ai-wire] revalidate failed for', path, err);
    }
  }
}
