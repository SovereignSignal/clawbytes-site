import Link from 'next/link';
import { Empty } from '@/components/Empty';
import { PageHeader } from '@/components/PageHeader';
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
      <PageHeader
        section="01"
        kicker="Letter"
        title={brand.newsletterName}
        dek="Published letters only. Drafts stay off the site until you publish them."
      />
      {issues.length === 0 ? <Empty>No published issues yet.</Empty> : null}
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
