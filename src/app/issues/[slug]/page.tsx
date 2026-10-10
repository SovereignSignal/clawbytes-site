import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Crab } from '@/components/Crab';
import { SectionTag } from '@/components/SectionTag';
import { brand } from '@/config/brand';
import { formatWhen } from '@/lib/format';
import { renderMarkdown } from '@/lib/markdown';
import { getPublishedIssue } from '@/lib/queries';
import { includeSampleData } from '@/lib/samples';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const issue = await getPublishedIssue(slug, includeSampleData()).catch(() => null);
  if (!issue) return { title: brand.newsletterName };
  return { title: issue.title, description: issue.themeLine };
}

export default async function IssuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const issue = await getPublishedIssue(slug, includeSampleData()).catch(() => null);
  if (!issue) notFound();
  const html = renderMarkdown(issue.bodyMarkdown);
  return (
    <main>
      <SectionTag section="01" label="Weekly" meta={formatWhen(issue.publishedAt)} />
      <p className="kicker"><Crab /> {brand.newsletterName}</p>
      <article className="prose" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
