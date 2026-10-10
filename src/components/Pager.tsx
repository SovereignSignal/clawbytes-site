import Link from 'next/link';
import { listingHref } from '@/lib/listing';

export function Pager({
  page,
  hasMore,
  path,
  params,
}: {
  page: number;
  hasMore: boolean;
  path: string;
  params: Record<string, string | undefined>;
}) {
  if (page <= 1 && !hasMore) return null;
  return (
    <div className="pager">
      {page > 1 ? <Link href={listingHref(path, params, page - 1)}>Newer</Link> : <span />}
      {hasMore ? <Link href={listingHref(path, params, page + 1)}>Older</Link> : <span />}
    </div>
  );
}
