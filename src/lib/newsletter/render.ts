/**
 * @deprecated Draft rendering moved to Substack. Kept so stored drafts and tests still load.
 */
import { brand } from '@/config/brand';
import { formatWhen } from '@/lib/format';
import type { PublicSectionId, RankableItem } from './rank';

export type DraftLead = {
  canonicalKey: string;
  title: string;
  url: string;
  sentence: string;
};

export type DraftSection = {
  id: PublicSectionId;
  heading: string;
  note: string;
  items: RankableItem[];
};

export type NewsletterDraft = {
  slug: string;
  title: string;
  themeLine: string;
  opening: string;
  weekStart: Date;
  leads: DraftLead[];
  sections: DraftSection[];
  source: 'model' | 'template';
  model: string | null;
};

const SECTION_HEADINGS: Record<PublicSectionId, string> = {
  tools: 'Tools',
  models: 'Models',
  repos: 'Repos',
};

export function sectionHeading(id: PublicSectionId): string {
  return SECTION_HEADINGS[id];
}

export function renderMarkdown(draft: NewsletterDraft): string {
  const lines: string[] = [
    `# ${draft.title}`,
    '',
    `*${draft.themeLine}*`,
    '',
    brand.newsletterBlurb,
    '',
    draft.opening,
    '',
  ];
  if (draft.leads.length) {
    lines.push('## The short list', '');
    for (const lead of draft.leads) {
      lines.push(`- ${lead.sentence} ([source](${lead.url}))`);
    }
    lines.push('');
  }
  for (const section of draft.sections) {
    lines.push(`## ${section.heading}`, '', section.note, '');
    for (const item of section.items) {
      lines.push(`- ${item.title} ([source](${item.url}))`);
    }
    lines.push('');
  }
  lines.push(`${brand.name}. ${brand.byline}.`, '');
  return lines.join('\n').trim() + '\n';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Email-ready HTML. No images, no remote fonts, no tracking. */
export function renderEmailHtml(draft: NewsletterDraft): string {
  const leads = draft.leads
    .map(
      (lead) =>
        `<li style="margin:0 0 12px;">${escapeHtml(lead.sentence)} <a href="${escapeHtml(lead.url)}">source</a></li>`,
    )
    .join('');
  const sections = draft.sections
    .map((section) => {
      const items = section.items
        .map(
          (item) =>
            `<li style="margin:0 0 8px;"><a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a></li>`,
        )
        .join('');
      return `<h2 style="font-size:18px;margin:28px 0 8px;">${escapeHtml(section.heading)}</h2>
<p style="margin:0 0 8px;">${escapeHtml(section.note)}</p>
<ul style="padding-left:18px;margin:0;">${items}</ul>`;
    })
    .join('');
  const when = formatWhen(draft.weekStart);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(draft.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f3ec;color:#1a1814;">
<!-- draft source: ${draft.source}${draft.model ? ` ${draft.model}` : ''}. Not sent automatically. -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ec;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;font-family:Georgia,'Iowan Old Style',serif;font-size:17px;line-height:1.5;color:#1a1814;">
<tr><td>
<p style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;margin:0 0 8px;">${escapeHtml(brand.newsletterName)}</p>
<h1 style="font-size:28px;line-height:1.2;margin:0 0 8px;">${escapeHtml(draft.title)}</h1>
<p style="margin:0 0 8px;font-style:italic;">${escapeHtml(draft.themeLine)}</p>
<p style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;margin:0 0 20px;">Week of ${escapeHtml(when)}</p>
<p style="margin:0 0 20px;">${escapeHtml(brand.newsletterBlurb)}</p>
<p style="margin:0 0 20px;">${escapeHtml(draft.opening)}</p>
${leads ? `<h2 style="font-size:18px;margin:0 0 8px;">The short list</h2><ul style="padding-left:18px;margin:0 0 8px;">${leads}</ul>` : ''}
${sections}
<p style="margin:32px 0 0;font-size:14px;">${escapeHtml(brand.name)}. ${escapeHtml(brand.byline)}.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;
}
