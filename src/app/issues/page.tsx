import Link from 'next/link';
import { brand } from '@/config/brand';
import { formatWhen } from '@/lib/format';
import { listPublishedIssues } from '@/lib/queries';
import { safeQuery } from '@/lib/safe';
import { includeSampleData } from '@/lib/samples';

export const dynamic = 'force-dynamic';

export const metadata = { title: brand.newsletterName };

export default async function IssuesPage() {
  const issues = await safeQuery(() => listPublishedIssues(includeSampleData()), []);
  return (
    <main>
      <h1>{brand.newsletterName}</h1>
      <p className="dek">Published letters only. Drafts stay off the site until you publish them.</p>
      {issues.length === 0 ? <p className="empty">No published issues yet.</p> : null}
      <ol className="item-list">
        {issues.map((issue) => (
          <li key={issue.slug} className="item">
            <p className="kicker">{formatWhen(issue.publishedAt)}{issue.sample ? ' · Sample' : ''}</p>
            <h3><Link href={`/issues/${issue.slug}`}>{issue.title}</Link></h3>
            <p className="summary">{issue.themeLine}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
