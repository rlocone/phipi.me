/**
 * Client-safe morning-queue types, fixture, and category picker.
 * Do not import prisma or server-only helpers from this file.
 */
export const SITE_CATEGORIES = [
  'AI',
  'Cybersecurity',
  'Privacy',
  'Nix',
  'Governance',
  'Quantum',
  'Hardware',
  'Hacking',
] as const;

export type SiteCategory = (typeof SITE_CATEGORIES)[number];
export type QueueSource = 'recall' | 'miniflux';
export type ImageSourceKind = 'rss' | 'og' | 'page';

export type ImageCandidate = {
  kind: ImageSourceKind;
  url: string;
  label: string;
};

export type ExtraReading = {
  title: string;
  url: string;
};

export type MorningQueueItem = {
  id: string;
  source: QueueSource;
  title: string;
  url: string;
  youtubeId: string | null;
  originLabel: string;
  excerpt: string;
  images: ImageCandidate[];
  selectedImageKind: ImageSourceKind;
  category: SiteCategory;
  extraReading: ExtraReading | null;
  preKept: boolean;
};

export type MorningQueuePayload = {
  items: MorningQueueItem[];
  usedFixture: boolean;
  liveMiniflux: number;
  liveRecall: number;
  skippedApproved: number;
  skippedExcluded: number;
  busy: boolean;
  generatedAt: string;
};

const VOLUME_CAP = 15;

const CATEGORY_KEYWORDS: Record<SiteCategory, string[]> = {
  AI: ['ai', 'llm', 'gpt', 'claude', 'anthropic', 'openai', 'grok', 'model', 'agent'],
  Cybersecurity: ['cisa', 'nsa', 'fbi', 'cve', 'exploit', 'malware', 'ransomware', 'vulnerability', 'advisory', 'zero-day'],
  Privacy: ['privacy', 'digital id', 'eidas', 'signal', 'surveillance', 'gdpr', 'tracking'],
  Nix: ['nix', 'nixos', 'flake', 'nixpkgs'],
  Governance: ['congress', 'senate', 'regulation', 'bill', 'policy', 'law', 'white house'],
  Quantum: ['quantum', 'qubit', 'post-quantum', 'cryptanalysis', 'qec'],
  Hardware: ['hardware', 'risc-v', 'chip', 'laptop', 'gpu', 'cpu', 'unisoc', 'silicon'],
  Hacking: ['hacking', 'jailbreak', 'root', 'pwn', 'side-channel', 'volte', 'exploit chain'],
};

export function placeholderImage(kind: ImageSourceKind, seed: string): string {
  const labels: Record<ImageSourceKind, string> = {
    rss: 'RSS',
    og: 'OG',
    page: 'Page',
  };
  return `https://placehold.co/640x360/1a1a2e/8e5ae2?text=${encodeURIComponent(labels[kind] + ' · ' + seed.slice(0, 18))}`;
}

export function imagesFor(seed: string, overrides?: Partial<Record<ImageSourceKind, string>>): ImageCandidate[] {
  const kinds: ImageSourceKind[] = ['rss', 'og', 'page'];
  const labels: Record<ImageSourceKind, string> = {
    rss: 'RSS enclosure',
    og: 'OG metadata',
    page: 'Page',
  };
  return kinds.map((kind) => ({
    kind,
    label: labels[kind],
    url: overrides?.[kind] || placeholderImage(kind, seed),
  }));
}

export const MORNING_QUEUE_FIXTURE: MorningQueueItem[] = [
  {
    id: 'recall-anthropic-github',
    source: 'recall',
    title: 'Anthropic GitHub attack',
    url: 'https://www.anthropic.com/news/detecting-and-preventing-attacks-on-software',
    youtubeId: null,
    originLabel: 'YouTube',
    excerpt: 'How attackers abused GitHub workflows and what Anthropic published about agent risk.',
    images: imagesFor('anthropic-github'),
    selectedImageKind: 'og',
    category: 'AI',
    extraReading: {
      title: 'Anthropic on agent risk',
      url: 'https://www.anthropic.com/research/agentic-misalignment',
    },
    preKept: true,
  },
  {
    id: 'recall-anthropic-cryptanalysis',
    source: 'recall',
    title: 'Anthropic cryptanalysis',
    url: 'https://www.anthropic.com/research/circuit-tracing',
    youtubeId: null,
    originLabel: 'metadata',
    excerpt: 'Circuit tracing notes that bleed into post-quantum cryptanalysis questions.',
    images: imagesFor('anthropic-crypto'),
    selectedImageKind: 'og',
    category: 'Quantum',
    extraReading: null,
    preKept: true,
  },
  {
    id: 'recall-grok-bot',
    source: 'recall',
    title: 'Grok Bot $200',
    url: 'https://x.ai/blog/grok',
    youtubeId: null,
    originLabel: 'YouTube',
    excerpt: 'Pricing and capability notes on a high-tier Grok agent.',
    images: imagesFor('grok-bot'),
    selectedImageKind: 'rss',
    category: 'AI',
    extraReading: null,
    preKept: true,
  },
  {
    id: 'recall-nix-workstation',
    source: 'recall',
    title: 'Local-first Nix workstation notes',
    url: 'https://nixos.org/manual/nixos/stable/',
    youtubeId: null,
    originLabel: 'metadata',
    excerpt: 'A saved Recall card on pinning flakes and keeping a rebuildable laptop.',
    images: imagesFor('nix-workstation'),
    selectedImageKind: 'page',
    category: 'Nix',
    extraReading: null,
    preKept: true,
  },
  {
    id: 'recall-pq-tls',
    source: 'recall',
    title: 'Post-quantum TLS experiments',
    url: 'https://blog.cloudflare.com/post-quantum-for-all/',
    youtubeId: null,
    originLabel: 'YouTube',
    excerpt: 'What actually ships when browsers and CDNs turn on PQ key exchange.',
    images: imagesFor('pq-tls'),
    selectedImageKind: 'og',
    category: 'Quantum',
    extraReading: {
      title: 'Cloudflare PQ overview',
      url: 'https://blog.cloudflare.com/post-quantum-for-all/',
    },
    preKept: true,
  },
  {
    id: 'miniflux-cisa-warning',
    source: 'miniflux',
    title: 'CISA Joins NSA, FBI warning',
    url: 'https://www.cisa.gov/news-events/alerts/joint-csa-nsa-fbi-warning',
    youtubeId: null,
    originLabel: 'RSS',
    excerpt: 'Joint advisory on an active exploitation campaign against internet-facing services.',
    images: imagesFor('cisa-warning'),
    selectedImageKind: 'rss',
    category: 'Cybersecurity',
    extraReading: {
      title: 'CISA known exploited catalog',
      url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
    },
    preKept: false,
  },
  {
    id: 'miniflux-eu-digital-id',
    source: 'miniflux',
    title: "EU's Digital ID is Killing the Open Phone Market",
    url: 'https://www.youtube.com/watch?v=eudiw-digital-wallet',
    youtubeId: 'eudiw-digital-wallet',
    originLabel: 'YouTube',
    excerpt: 'How eIDAS wallet rules collide with sideloading and independent phone OS projects.',
    images: imagesFor('eu-digital-id'),
    selectedImageKind: 'og',
    category: 'Privacy',
    extraReading: null,
    preKept: false,
  },
  {
    id: 'miniflux-unisoc-volte',
    source: 'miniflux',
    title: 'Unisoc VoLTE Video Call Exploit Chain',
    url: 'https://googleprojectzero.blogspot.com/unisoc-volte-video-call',
    youtubeId: null,
    originLabel: 'RSS',
    excerpt: 'A baseband-adjacent chain that starts in a VoLTE video path.',
    images: imagesFor('unisoc-volte'),
    selectedImageKind: 'rss',
    category: 'Cybersecurity',
    extraReading: null,
    preKept: false,
  },
  {
    id: 'miniflux-nixos-freeze',
    source: 'miniflux',
    title: 'NixOS unstable channel freeze',
    url: 'https://nixos.org/blog/announcements/unstable-channel-freeze',
    youtubeId: null,
    originLabel: 'RSS',
    excerpt: 'Staging freeze notes and what hydra is actually evaluating this week.',
    images: imagesFor('nixos-freeze'),
    selectedImageKind: 'rss',
    category: 'Nix',
    extraReading: null,
    preKept: false,
  },
  {
    id: 'miniflux-hw-sidechannel',
    source: 'miniflux',
    title: 'Hardware side-channel on commodity laptops',
    url: 'https://www.usenix.org/conference/woot26/laptop-side-channel',
    youtubeId: null,
    originLabel: 'RSS',
    excerpt: 'Power and EM leakage from a stock ultrabook without extra probes.',
    images: imagesFor('hw-sidechannel'),
    selectedImageKind: 'og',
    category: 'Hardware',
    extraReading: null,
    preKept: false,
  },
  {
    id: 'miniflux-ai-disclosure',
    source: 'miniflux',
    title: 'Senate draft on AI model disclosure',
    url: 'https://www.congress.gov/bill/ai-model-disclosure-draft',
    youtubeId: null,
    originLabel: 'RSS',
    excerpt: 'A draft bill that would require training-data and eval summaries for frontier models.',
    images: imagesFor('ai-disclosure'),
    selectedImageKind: 'page',
    category: 'Governance',
    extraReading: {
      title: 'NIST AI RMF',
      url: 'https://www.nist.gov/itl/ai-risk-management-framework',
    },
    preKept: false,
  },
  {
    id: 'miniflux-signal-sealed',
    source: 'miniflux',
    title: "Signal's new sealed-sender tweak",
    url: 'https://signal.org/blog/sealed-sender-update',
    youtubeId: null,
    originLabel: 'RSS',
    excerpt: 'Metadata-minimizing delivery changes and what clients need to ship.',
    images: imagesFor('signal-sealed'),
    selectedImageKind: 'og',
    category: 'Privacy',
    extraReading: null,
    preKept: false,
  },
];

export function pickCategory(title: string, url = '', excerpt = ''): SiteCategory {
  const hay = `${title} ${url} ${excerpt}`.toLowerCase();
  let best: SiteCategory = 'AI';
  let score = 0;
  for (const category of SITE_CATEGORIES) {
    const hits = CATEGORY_KEYWORDS[category].filter((kw) => hay.includes(kw)).length;
    if (hits > score) {
      score = hits;
      best = category;
    }
  }
  return best;
}

