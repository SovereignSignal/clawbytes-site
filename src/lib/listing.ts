/** Query string for a filtered, paged list. Page 1 omits `page`. */
export function listingHref(path: string, params: Record<string, string | undefined>, page: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set('page', String(page));
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
