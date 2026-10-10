export function siteUrl(): string {
  const raw = process.env.SITE_URL?.trim() || 'http://localhost:3000';
  return raw.replace(/\/$/, '');
}
