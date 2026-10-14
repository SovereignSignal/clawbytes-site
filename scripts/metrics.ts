import 'dotenv/config';
import { closeDb, getDb } from '../src/db/client';
import { runMetrics } from '../src/lib/metrics/job';

/**
 * Railway cron entry. Runs once and exits.
 * A healthy run prints nothing. Migrate still prints its own line.
 */
async function main(): Promise<number> {
  try {
    const result = await runMetrics({ db: getDb() });
    return result.webhookFailed ? 1 : 0;
  } finally {
    await closeDb();
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err: unknown) => {
    console.error('[ai-wire] metrics run failed:', err);
    process.exitCode = 1;
  });
