/**
 * Public naming lives in this file. Changing the site or newsletter name
 * is a one-line edit here; pages, feeds, and drafts read these strings.
 * The git repo stays ai-wire, and ingest env vars stay AI_WIRE_*.
 */
export const brand = {
  name: 'ClawBytes',
  /** Decorative mark. Screen readers skip it; the name stays the accessible label. */
  mark: '🦀',
  newsletterName: 'ClawBytes Weekly',
  byline: 'A Sovereign Signal project',
  tagline: 'The curated tier of the AI wires.',
  description:
    'ClawBytes is the curated registry and weekly letter on top of the Telegram wires: tools and shipping news, new models, and interesting repos.',
  wires: [
    {
      id: 'tools',
      label: 'Tools',
      href: '/tools',
      blurb: 'Coding agents, AI dev tools, and status-page incidents. Lanes: Ship, Watch, Read, Community.',
      channelLabel: 'ClawBytes',
      joinUrl: 'https://t.me/clawbytes',
      handle: 't.me/clawbytes',
      sourceBots: ['clawbytes'],
      public: true,
    },
    {
      id: 'models',
      label: 'Models',
      href: '/models',
      blurb: 'New AI models, every modality, in five tiers.',
      channelLabel: 'ModelBytes',
      joinUrl: 'https://t.me/ModelBytes',
      handle: 't.me/ModelBytes',
      sourceBots: ['modelbytes'],
      public: true,
    },
    {
      id: 'repos',
      label: 'Repos',
      href: '/repos',
      blurb: 'Trending GitHub repos, grouped by theme.',
      channelLabel: 'interesting-repos',
      joinUrl: 'https://t.me/interestingrepos',
      handle: 't.me/interestingrepos',
      sourceBots: ['interesting-repos'],
      public: true,
    },
    {
      id: 'releases',
      label: 'Releases',
      href: null,
      blurb: 'Tool releases from the private Release Bot. They show on Tools; there is no public join link.',
      channelLabel: 'Release Bot',
      joinUrl: null,
      handle: null,
      sourceBots: ['release-bot'],
      public: false,
    },
  ],
} as const;

export type Wire = (typeof brand.wires)[number];
export type PublicWireId = 'tools' | 'models' | 'repos';

export function publicWires(): Array<Wire & { joinUrl: string; href: string }> {
  return brand.wires.filter(
    (wire): wire is Wire & { joinUrl: string; href: string } => wire.public && wire.joinUrl !== null && wire.href !== null,
  );
}

export function botLabel(sourceBot: string): string {
  const wire = brand.wires.find((entry) =>
    (entry.sourceBots as readonly string[]).includes(sourceBot),
  );
  return wire?.channelLabel ?? sourceBot;
}
