export const DEFAULT_OLLAMA_MODEL = 'kimi-k3';

export function ollamaChatUrl(host: string): string {
  const base = host.trim().replace(/\/$/, '');
  if (base.endsWith('/v1')) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}

export function modelListFromEnv(env: Record<string, string | undefined> = process.env): string[] {
  const primary = env.OLLAMA_MODEL?.trim() || DEFAULT_OLLAMA_MODEL;
  const fallbacks = (env.OLLAMA_FALLBACK_MODELS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry !== primary);
  return [primary, ...fallbacks];
}

/** Pulls assistant text. Empty content (common on reasoning models) is a miss. */
export function contentFromChatResponse(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const choices = (json as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') return null;
  const message = (choices[0] as { message?: unknown }).message;
  if (!message || typeof message !== 'object') return null;
  const content = (message as { content?: unknown }).content;
  if (typeof content === 'string') {
    const trimmed = content.trim();
    return trimmed.length ? trimmed : null;
  }
  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') return part.text;
        return '';
      })
      .join('')
      .trim();
    return text.length ? text : null;
  }
  return null;
}

export async function completeChat(model: string, userPrompt: string, systemPrompt: string): Promise<string | null> {
  const host = process.env.OLLAMA_HOST;
  const key = process.env.OLLAMA_API_KEY;
  if (!host || !key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(ollamaChatUrl(host), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 8192,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error(`[ai-wire] model ${model} returned HTTP ${response.status}`);
      return null;
    }
    const json: unknown = await response.json();
    return contentFromChatResponse(json);
  } catch (err) {
    console.error(`[ai-wire] model ${model} failed:`, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
