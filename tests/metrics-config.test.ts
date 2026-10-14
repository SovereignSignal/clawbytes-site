import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { partial, railwayProject } from '../.railway/railway';

type Deploy = {
  startCommand?: string;
  healthcheckPath?: string | null;
  healthcheckTimeout?: number;
  cronSchedule?: string;
  restartPolicyType?: string;
  restartPolicyMaxRetries?: number;
};

type ServiceNode = {
  name: string;
  source?: { repo?: string };
  build?: { builder?: string; buildCommand?: string };
  deploy?: Deploy;
};

describe('metrics cron config', () => {
  it('keeps the cron service off the web start command', () => {
    const webFile = JSON.parse(readFileSync('railway.json', 'utf8')) as {
      build: { builder: string; buildCommand: string };
      deploy: Deploy;
    };
    const defined = railwayProject() as {
      name: string;
      variables?: { managed?: boolean };
      resources: ServiceNode[];
    };
    const services = new Map(defined.resources.map((service) => [service.name, service]));
    const web = services.get('web');
    const metrics = services.get('metrics');
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: { metrics: string } };
    const readme = readFileSync('README.md', 'utf8');

    expect(existsSync('railway.metrics.json')).toBe(false);
    expect(partial).toBe('clawbytes-site');
    expect(defined.name).toBe('clawbytes-site');
    expect(defined.variables?.managed).toBe(false);
    expect(defined.resources.map((service) => service.name)).toEqual(['web', 'metrics']);

    expect(webFile.build.builder).toBe('RAILPACK');
    expect(webFile.build.buildCommand).toBe('npm run build');
    expect(webFile.deploy.startCommand).toBe('npm run start');
    expect(webFile.deploy.healthcheckPath).toBe('/api/health');
    expect(webFile.deploy.healthcheckTimeout).toBe(120);
    expect(webFile.deploy.restartPolicyType).toBe('ON_FAILURE');
    expect(webFile.deploy.restartPolicyMaxRetries).toBe(3);
    expect(webFile.deploy.cronSchedule).toBeUndefined();

    expect(web?.source?.repo).toBe('SovereignSignal/clawbytes-site');
    expect(web?.build).toEqual({ builder: 'RAILPACK', buildCommand: 'npm run build' });
    expect(web?.deploy).toEqual({
      startCommand: 'npm run start',
      healthcheckPath: '/api/health',
      healthcheckTimeout: 120,
      restartPolicyType: 'ON_FAILURE',
      restartPolicyMaxRetries: 3,
    });

    expect(metrics?.source?.repo).toBe('SovereignSignal/clawbytes-site');
    expect(metrics?.build).toEqual({ builder: 'RAILPACK', buildCommand: 'npm run build' });
    expect(metrics?.deploy?.startCommand).toBe('npm run metrics');
    expect(metrics?.deploy?.cronSchedule).toBe('0 8,12,16,20 * * *');
    expect(metrics?.deploy?.healthcheckPath).toBeUndefined();
    expect(metrics?.deploy?.restartPolicyType).toBe('ON_FAILURE');
    expect(metrics?.deploy?.restartPolicyMaxRetries).toBe(3);

    expect(pkg.scripts.metrics).toBe('npm run db:migrate && tsx scripts/metrics.ts');
    expect(readme).toContain('.railway/railway.ts');
    expect(readme).toContain('railway config migrate cutover');
    expect(readme).toContain('railway config plan');
    expect(readme).toContain('railway config apply');
    expect(readme).toContain('npm run metrics');
    expect(readme).toContain('0 8,12,16,20 * * *');
    expect(readme).toContain('HEALTH_ALERT_WEBHOOK_URL');
    expect(readme).toContain('HEALTH_STALE_HOURS_RELEASE_BOT');
    expect(readme).not.toContain('railway.metrics.json');
    expect(readFileSync('src/app/sitemap.ts', 'utf8')).toContain("'/stats'");
    expect(readFileSync('src/app/stats/page.tsx', 'utf8')).toContain('listSubscriberSeries');
    expect(readFileSync('src/app/stats/page.tsx', 'utf8')).not.toContain('readMetrics');
    expect(readFileSync('src/app/stats/page.tsx', 'utf8')).not.toContain('sourceYield');
  });
});
