import { botLabel } from '@/config/brand';

const kindLabels: Record<string, string> = {
  model: 'Model',
  tool_release: 'Release',
  repo: 'Repo',
  news: 'News',
  status: 'Status',
  paper: 'Paper',
};

export function kindLabel(kind: string): string {
  return kindLabels[kind] ?? kind;
}

export function formatWhen(date: Date | null | undefined): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatScore(score: number | null): string {
  if (score === null || Number.isNaN(score)) return '';
  if (Number.isInteger(score)) return String(score);
  return String(Math.round(score * 100) / 100);
}

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function botName(sourceBot: string): string {
  return botLabel(sourceBot);
}

export function weekLabel(start: Date): string {
  return formatWhen(start);
}
