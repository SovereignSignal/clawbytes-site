import 'dotenv/config';
import { closeDb, getDb } from '../src/db/client';
import { publishIssue } from '../src/lib/newsletter/store';
import { siteUrl } from '../src/lib/site-url';

function slugArg(argv: string[]): string {
  const index = argv.indexOf('--slug');
  const value = index >= 0 ? argv[index + 1] : undefined;
  if (!value || value.startsWith('--')) {
    console.error('Usage: npm run newsletter:publish -- --slug week-YYYY-MM-DD');
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
const slug = slugArg(process.argv.slice(2));
const db = getDb();
try {
  const result = await publishIssue(db, slug);
  if (result === 'already') {
    console.log(`${slug} is already published`);
  } else {
    console.log(`published ${slug}`);
  }
  console.log(`${siteUrl()}/issues/${slug}`);
  console.log('No email was sent. Paste exports/*.html into the newsletter platform yourself.');
} finally {
  await closeDb();
}
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
