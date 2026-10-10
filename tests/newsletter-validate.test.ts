import { describe, expect, it } from 'vitest';
import { brand } from '@/config/brand';
import { draftBodies, extractJson, generateDraft } from '@/lib/newsletter/generate';
import { contentFromChatResponse, modelListFromEnv, ollamaChatUrl } from '@/lib/newsletter/llm';
import { extractUrls, validateProse } from '@/lib/newsletter/validate';
import { rankable } from './helpers/item';

const weekStart = new Date('2026-10-05T00:00:00.000Z');

function weekItems() {
  return [
    rankable({
      appearances: [
        { sourceBot: 'modelbytes', channelPostUrl: 'https://t.me/ModelBytes/1001' },
        { sourceBot: 'clawbytes', channelPostUrl: 'https://t.me/clawbytes/1001' },
      ],
    }),
    rankable({
      canonicalKey: 'repo:acme/widget',
      kind: 'repo',
      title: 'acme/widget',
      url: 'https://example.com/widget',
      summary: null,
      org: 'acme',
      lane: 'agents',
      score: 4,
      modality: null,
      appearances: [{ sourceBot: 'interesting-repos' }],
    }),
  ];
}

function validModelJson(): string {
  return JSON.stringify({
    theme_line: 'Claude is so back',
    opening: 'Claude Haiku 5.5 showed up on more than one wire.',
    leads: [
      { canonical_key: 'model:anthropic/claude-haiku-5.5', sentence: 'Claude Haiku 5.5 is the lead.' },
      { canonical_key: 'repo:acme/widget', sentence: 'acme/widget is the repo to read.' },
    ],
    sections: [
      { wire: 'tools', note: 'Tools carried 1 item this week.' },
      { wire: 'models', note: 'Models carried 1 item this week.' },
      { wire: 'repos', note: 'Repos carried 1 item this week.' },
    ],
  });
}

describe('newsletter link validator', () => {
  it('rejects links and numbers that are not in the input set', () => {
    const numbers = new Set(['1', '5.5']);
    expect(validateProse('Claude Haiku 5.5 shipped.', { allowedUrls: new Set(), allowedNumbers: numbers }).ok).toBe(true);
    const invented = validateProse('99 models shipped.', { allowedUrls: new Set(), allowedNumbers: numbers });
    expect(invented.ok).toBe(false);
    const foreign = validateProse('See https://evil.example/post.', {
      allowedUrls: new Set(['https://example.com/haiku']),
      allowedNumbers: numbers,
    });
    expect(foreign.ok).toBe(false);
    expect(extractUrls('Read [it](https://example.com/haiku).')).toEqual(['https://example.com/haiku']);
  });

  it('uses a valid model, and falls back when prose invents a link or the content is empty', async () => {
    const calls: string[] = [];
    const good = await generateDraft({
      items: weekItems(),
      weekStart,
      slug: 'week-2026-10-05',
      models: ['kimi-k3', 'glm-5.3'],
      complete: async (model) => {
        calls.push(model);
        if (model === 'kimi-k3') return null;
        return validModelJson();
      },
    });
    expect(calls).toEqual(['kimi-k3', 'glm-5.3']);
    expect(good.source).toBe('model');
    expect(good.model).toBe('glm-5.3');
    expect(good.title.startsWith(brand.newsletterName)).toBe(true);
    expect(good.leads[0]?.sentence).toMatch(/Claude Haiku 5.5/);
    const goodUrls = extractUrls(draftBodies(good).markdown);
    expect(goodUrls.every((url) => ['https://example.com/haiku', 'https://example.com/widget'].includes(url))).toBe(true);

    const fallback = await generateDraft({
      items: weekItems(),
      weekStart,
      slug: 'week-2026-10-05',
      models: ['kimi-k3'],
      complete: async () =>
        JSON.stringify({
          theme_line: 'Claude is so back',
          opening: 'Claude Haiku 5.5 and a made up https://evil.example/story.',
          leads: [],
        }),
    });
    expect(fallback.source).toBe('template');
    expect(fallback.opening).not.toMatch(/evil\.example/);
    const urls = extractUrls(draftBodies(fallback).markdown);
    expect(urls.every((url) => url.startsWith('https://example.com/'))).toBe(true);
    expect(urls).not.toContain('https://evil.example/story');
  });

  it('does not call a model for an empty week', async () => {
    let called = false;
    const draft = await generateDraft({
      items: [],
      weekStart,
      slug: 'week-2026-10-05',
      models: ['kimi-k3'],
      complete: async () => {
        called = true;
        return validModelJson();
      },
    });
    expect(called).toBe(false);
    expect(draft.source).toBe('template');
    expect(draft.themeLine).toMatch(/quiet week/);
    expect(extractUrls(draftBodies(draft).markdown)).toEqual([]);
  });

  it('treats empty reasoning-model content as a miss', () => {
    expect(contentFromChatResponse({ choices: [{ message: { content: '', reasoning: 'trace' } }] })).toBeNull();
    expect(contentFromChatResponse({ choices: [{ message: { content: '  ' } }] })).toBeNull();
    expect(contentFromChatResponse({ choices: [{ message: { content: 'Hello' } }] })).toBe('Hello');
    expect(ollamaChatUrl('https://ollama.com')).toBe('https://ollama.com/v1/chat/completions');
    expect(ollamaChatUrl('https://ollama.com/v1/')).toBe('https://ollama.com/v1/chat/completions');
    expect(modelListFromEnv({ OLLAMA_MODEL: 'kimi-k3', OLLAMA_FALLBACK_MODELS: 'glm-5.3, deepseek-v4.1-flash' })).toEqual([
      'kimi-k3',
      'glm-5.3',
      'deepseek-v4.1-flash',
    ]);
    expect(extractJson('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });
});
