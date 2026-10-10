const URL_RE = /https?:\/\/[^\s<>)\]]+/gi;

export function extractUrls(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(URL_RE)) {
    found.push(match[0].replace(/[.,;:]+$/, ''));
  }
  return found;
}

/** Numeric tokens, plus a leading-zero form collapsed (`05` → `5`, `0.50` → `0.5`). */
export function numberTokens(text: string): Set<string> {
  const tokens = text.match(/\d+(?:\.\d+)?/g) ?? [];
  const allowed = new Set<string>();
  for (const token of tokens) {
    allowed.add(token);
    const value = Number(token);
    if (Number.isFinite(value)) allowed.add(String(value));
  }
  return allowed;
}

export type ProseRules = {
  /** URLs the prose may mention. An empty set means the prose may not contain links. */
  allowedUrls: Set<string>;
  allowedNumbers: Set<string>;
  /** When set, the prose must contain this string, case-insensitive. */
  mustInclude?: string;
};

export type ProseViolation = { ok: false; reason: string };
export type ProseOk = { ok: true };

/**
 * Model prose may only link to URLs from the input set and may only use
 * numbers that already appear in the fact sheet. It never adds items.
 */
export function validateProse(text: string, rules: ProseRules): ProseOk | ProseViolation {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, reason: 'empty prose' };
  if (/\bwww\./i.test(trimmed)) return { ok: false, reason: 'bare www link' };

  for (const url of extractUrls(trimmed)) {
    if (!rules.allowedUrls.has(url)) {
      return { ok: false, reason: `link not in the input set: ${url}` };
    }
  }

  const used = trimmed.match(/\d+(?:\.\d+)?/g) ?? [];
  for (const token of used) {
    const normalized = String(Number(token));
    if (!rules.allowedNumbers.has(token) && !rules.allowedNumbers.has(normalized)) {
      return { ok: false, reason: `number not in the input set: ${token}` };
    }
  }

  if (rules.mustInclude && !trimmed.toLowerCase().includes(rules.mustInclude.toLowerCase())) {
    return { ok: false, reason: `missing required text: ${rules.mustInclude}` };
  }
  return { ok: true };
}

export function collectAllowedNumbers(parts: string[]): Set<string> {
  return numberTokens(parts.join('\n'));
}
