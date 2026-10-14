import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('metrics cron config', () => {
  it('keeps the cron service off the web start command', () => {
    const web = JSON.parse(readFileSync('railway.json', 'utf8')) as {
      deploy: { startCommand: string; healthcheckPath: string; cronSchedule?: string };
    };
    const cron = JSON.parse(readFileSync('railway.metrics.json', 'utf8')) as {
      deploy: { startCommand: string; cronSchedule: string; healthcheckPath: null; restartPolicyType: string };
    };
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: { metrics: string } };
    const readme = readFileSync('README.md', 'utf8');

    expect(web.deploy.startCommand).toBe('npm run start');
    expect(web.deploy.healthcheckPath).toBe('/api/health');
    expect(web.deploy.cronSchedule).toBeUndefined();
    expect(cron.deploy.startCommand).toBe('npm run metrics');
    expect(cron.deploy.cronSchedule).toBe('0 8,12,16,20 * * *');
    expect(cron.deploy.healthcheckPath).toBeNull();
    expect(cron.deploy.restartPolicyType).toBe('ON_FAILURE');
    expect(pkg.scripts.metrics).toBe('npm run db:migrate && tsx scripts/metrics.ts');
    expect(readme).toContain('railway.metrics.json');
    expect(readme).toContain('npm run metrics');
    expect(readme).toContain('0 8,12,16,20 * * *');
    expect(readme).toContain('HEALTH_ALERT_WEBHOOK_URL');
    expect(readme).toContain('HEALTH_STALE_HOURS_RELEASE_BOT');
    expect(readFileSync('src/app/sitemap.ts', 'utf8')).toContain("'/stats'");
    expect(readFileSync('src/app/stats/page.tsx', 'utf8')).toContain('listSubscriberSeries');
    expect(readFileSync('src/app/stats/page.tsx', 'utf8')).not.toContain('readMetrics');
    expect(readFileSync('src/app/stats/page.tsx', 'utf8')).not.toContain('sourceYield');
  });
});
