import { defineRailway, github, project, service } from "railway/iac";

declare module "railway/iac" {
  interface ProjectDefinition {
    /** When false, this file does not read or write service variables. */
    variables?: {
      managed?: boolean;
      ignore?: string[];
    };
  }
}

/**
 * Applied with `railway config plan` / `railway config apply`.
 * A git deploy does not read this file. `railway.json` still describes the
 * website until cutover, so a merge does not change the live web service.
 *
 * Partial ownership: Postgres and every other resource stay out of this file.
 * `variables.managed: false` leaves DATABASE_URL, SITE_URL, and the rest alone.
 */
export const partial = "clawbytes-site";

const source = github("SovereignSignal/clawbytes-site");

const build = {
  builder: "RAILPACK" as const,
  buildCommand: "npm run build",
};

const restart = {
  restartPolicyType: "ON_FAILURE" as const,
  restartPolicyMaxRetries: 3,
};

export function railwayProject() {
  // Dashboard name of the existing website. Public host is web-production-*.up.railway.app.
  const web = service("web", {
    source,
    build,
    start: "npm run start",
    healthcheck: "/api/health",
    healthcheckTimeout: 120,
    deploy: restart,
  });

  const metrics = service("metrics", {
    source,
    build,
    start: "npm run metrics",
    deploy: {
      ...restart,
      cronSchedule: "0 8,12,16,20 * * *",
    },
  });

  return project("clawbytes-site", {
    variables: { managed: false },
    resources: [web, metrics],
  });
}

export default defineRailway(() => railwayProject());
