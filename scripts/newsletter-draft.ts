import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { closeDb, getDb } from '../src/db/client';
import { draftBodies, generateDraft } from '../src/lib/newsletter/generate';
import { completeChat, modelListFromEnv } from '../src/lib/newsletter/llm';
import { saveDraftIssue } from '../src/lib/newsletter/store';
import { weekWindow } from '../src/lib/newsletter/week';
import { loadWeekItems } from '../src/lib/queries';

function weekArg(argv: string[]): string {
  const index = argv.indexOf('--week');
  const value = index >= 0 ? argv[index + 1] : undefined;
  if (!value || value.startsWith('--')) {
    console.error('Usage: npm run newsletter:draft -- --week YYYY-MM-DD [--include-samples]');
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
const argv = process.argv.slice(2);
const window = weekWindow(weekArg(argv));
const includeSamples = argv.includes('--include-samples');
const db = getDb();

try {
  const items = await loadWeekItems(window, includeSamples);
  const draft = await generateDraft({
    items,
    weekStart: window.start,
    slug: window.slug,
    models: modelListFromEnv(),
    complete: completeChat,
  });
  const bodies = draftBodies(draft);
  await saveDraftIssue(db, draft, bodies.markdown, bodies.html);

  const dir = path.resolve('exports');
  fs.mkdirSync(dir, { recursive: true });
  const markdownPath = path.join(dir, `${window.slug}.md`);
  const htmlPath = path.join(dir, `${window.slug}.html`);
  fs.writeFileSync(markdownPath, bodies.markdown);
  fs.writeFileSync(htmlPath, bodies.html);
  fs.writeFileSync(
    path.join(dir, `${window.slug}.meta.txt`),
    [
      `source: ${draft.source}`,
      `model: ${draft.model ?? ''}`,
      `items: ${items.length}`,
      `slug: ${draft.slug}`,
      'status: draft',
      `week: ${window.startDate}`,
      '',
    ].join('\n'),
  );

  console.log(
    `draft ${draft.slug} via ${draft.source}${draft.model ? ` (${draft.model})` : ''} items=${items.length}`,
  );
  console.log(markdownPath);
  console.log(htmlPath);
  console.log('Status is draft. Nothing was published or emailed.');
} finally {
  await closeDb();
}
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
