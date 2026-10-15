/**
 * Public naming lives in this file. Changing the site or newsletter name
 * is a one-line edit here; pages, feeds, and drafts read these strings.
 * The git repo stays ai-wire, and ingest env vars stay AI_WIRE_*.
 */
const DEFAULT_SUBSTACK_URL = 'https://sovereignsignal.substack.com/s/clawbytes';

const digestLine =
  'Twice a week, the agents, models, tools and open-source repos worth your time: what shipped, what matters, and where it\'s all going.';

export function substackUrlFrom(env: Record<string, string | undefined> = process.env): string {
  const raw = env.SUBSTACK_DIGEST_URL?.trim();
  return (raw || DEFAULT_SUBSTACK_URL).replace(/\/$/, '');
}

export const brand = {
  name: 'ClawBytes',
  /** Decorative mark. Screen readers skip it; the name stays the accessible label. */
  mark: '🦀',
  newsletterName: 'ClawBytes on Sovereign Signal',
  byline: 'A Sovereign Signal project',
  tagline: 'Where AI is heading.',
  description: digestLine,
  about: digestLine,
  newsletterBlurb: digestLine,
  get substackUrl(): string {
    return substackUrlFrom();
  },
  wires: [
    {
      id: 'tools',
      label: 'Tools',
      href: '/tools',
      blurb:
        'Agents and dev tools worth using, the releases that change the work, and status-page incidents worth watching.',
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
      blurb: 'New models worth building on, in every modality.',
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
      blurb: 'Open-source repos worth knowing, by the problem they take on.',
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

export function publicBlurb(id: PublicWireId): string {
  const wire = brand.wires.find((entry) => entry.id === id);
  return wire?.blurb ?? '';
}

export function botLabel(sourceBot: string): string {
  const wire = brand.wires.find((entry) =>
    (entry.sourceBots as readonly string[]).includes(sourceBot),
  );
  return wire?.channelLabel ?? sourceBot;
}
