import prisma from '@/lib/db';
import { extractYouTubeVideoId } from '@/lib/youtube';
import {
  MORNING_QUEUE_FIXTURE,
  imagesFor,
  pickCategory,
  type ExtraReading,
  type ImageSourceKind,
  type MorningQueueItem,
  type MorningQueuePayload,
  type QueueSource,
} from '@/lib/morning-queue-types';

export {
  MORNING_QUEUE_FIXTURE,
  SITE_CATEGORIES,
  pickCategory,
} from '@/lib/morning-queue-types';
export type {
  ExtraReading,
  ImageCandidate,
  ImageSourceKind,
  MorningQueueItem,
  MorningQueuePayload,
  QueueSource,
  SiteCategory,
} from '@/lib/morning-queue-types';

const VOLUME_CAP = 15;

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = '';
    if (u.hostname === 'youtu.be' || u.hostname.includes('youtube.com')) {
      const id = extractYouTubeVideoId(raw);
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }
    u.hostname = u.hostname.replace(/^www\./, '').toLowerCase();
    u.pathname = u.pathname.replace(/\/+$/, '') || '/';
    return u.toString();
  } catch {
    return raw.trim();
  }
}

function isExcludedItem(title: string, url: string, feedTitle = ''): boolean {
  const hay = `${title} ${url} ${feedTitle}`.toLowerCase();
  if (hay.includes('discord.com') || hay.includes('discord.gg')) return true;
  if (hay.includes('discord watchlist') || hay.includes('watchlist')) return true;
  if (hay.includes('gov intel') || hay.includes('govintel')) return true;
  if (hay.includes('government intel')) return true;
  return false;
}

type RawIncoming = {
  id: string;
  source: QueueSource;
  title: string;
  url: string;
  excerpt?: string;
  originLabel?: string;
  imageRss?: string | null;
  imageOg?: string | null;
  imagePage?: string | null;
  extraReading?: ExtraReading | null;
};

async function fetchMinifluxLive(): Promise<RawIncoming[]> {
  const base = process.env.MINIFLUX_URL || process.env.MINIFLUX_BASE_URL;
  const token = process.env.MINIFLUX_API_KEY || process.env.MINIFLUX_TOKEN || process.env.MINIFLUX_API_TOKEN;
  if (!base || !token) return [];

  const endpoint = `${base.replace(/\/$/, '')}/v1/entries?status=unread&limit=40&order=published_at&direction=desc`;
  const res = await fetch(endpoint, {
    headers: { 'X-Auth-Token': token, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    console.warn('Miniflux fetch failed', res.status);
    return [];
  }
  const data = await res.json();
  const entries = Array.isArray(data?.entries) ? data.entries : Array.isArray(data) ? data : [];
  return entries
    .map((entry: any, idx: number): RawIncoming | null => {
      const url = String(entry.url || entry.origin_url || '').trim();
      const title = String(entry.title || '').trim();
      if (!url || !title) return null;
      const enclosure = (entry.enclosures || []).find((enc: any) =>
        String(enc.mime_type || enc.mimeType || '').startsWith('image/')
      );
      return {
        id: `miniflux-${entry.id ?? idx}`,
        source: 'miniflux',
        title,
        url,
        excerpt: String(entry.content || entry.summary || '').replace(/<[^>]+>/g, ' ').slice(0, 280),
        originLabel: entry.feed?.title || 'RSS',
        imageRss: enclosure?.url || enclosure?.href || null,
        imageOg: null,
        imagePage: null,
      };
    })
    .filter(Boolean) as RawIncoming[];
}

async function fetchRecallLive(): Promise<RawIncoming[]> {
  const base = process.env.RECALL_API_URL || process.env.RECALL_URL;
  const token = process.env.RECALL_API_KEY || process.env.RECALL_TOKEN;
  if (!base || !token) return [];

  const res = await fetch(base, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    console.warn('Recall fetch failed', res.status);
    return [];
  }
  const data = await res.json();
  const cards = Array.isArray(data) ? data : data?.cards || data?.items || data?.results || [];
  return cards
    .map((card: any, idx: number): RawIncoming | null => {
      const url = String(card.url || card.originalUrl || card.source_url || card.link || '').trim();
      const title = String(card.title || card.name || '').trim();
      if (!url || !title) return null;
      return {
        id: `recall-${card.id ?? idx}`,
        source: 'recall',
        title,
        url,
        excerpt: String(card.excerpt || card.summary || card.notes || '').slice(0, 280),
        originLabel: card.source || card.origin || 'Recall',
        imageRss: card.image || card.thumbnail || null,
        imageOg: card.ogImage || card.og_image || null,
        imagePage: card.pageImage || card.page_image || null,
        extraReading: card.extraReading || null,
      };
    })
    .filter(Boolean) as RawIncoming[];
}

function rawToItem(raw: RawIncoming): MorningQueueItem {
  const youtubeId = extractYouTubeVideoId(raw.url);
  const seed = raw.id.replace(/[^a-z0-9]+/gi, '-');
  const images = imagesFor(seed, {
    rss: raw.imageRss || undefined,
    og: raw.imageOg || undefined,
    page: raw.imagePage || undefined,
  });
  const selectedImageKind: ImageSourceKind = raw.imageRss ? 'rss' : raw.imageOg ? 'og' : 'page';
  return {
    id: raw.id,
    source: raw.source,
    title: raw.title,
    url: raw.url,
    youtubeId,
    originLabel: raw.originLabel || (raw.source === 'recall' ? 'Recall' : 'RSS'),
    excerpt: raw.excerpt || '',
    images,
    selectedImageKind,
    category: pickCategory(raw.title, raw.url, raw.excerpt || ''),
    extraReading: raw.extraReading || null,
    preKept: raw.source === 'recall',
  };
}

export async function buildMorningQueue(): Promise<MorningQueuePayload> {
  let liveMiniflux: RawIncoming[] = [];
  let liveRecall: RawIncoming[] = [];
  try {
    liveMiniflux = await fetchMinifluxLive();
  } catch (error) {
    console.warn('Miniflux live fetch error', error);
  }
  try {
    liveRecall = await fetchRecallLive();
  } catch (error) {
    console.warn('Recall live fetch error', error);
  }

  const usedFixture = liveMiniflux.length === 0 && liveRecall.length === 0;
  const incoming = usedFixture
    ? MORNING_QUEUE_FIXTURE
    : [...liveRecall, ...liveMiniflux].map(rawToItem);

  let skippedExcluded = 0;
  const filtered = incoming.filter((item) => {
    if (isExcludedItem(item.title, item.url, item.originLabel)) {
      skippedExcluded += 1;
      return false;
    }
    return true;
  });

  const approved = await prisma.article.findMany({
    where: { status: { in: ['APPROVED', 'PUBLISHED'] } },
    select: { originalUrl: true, videoId: true },
  });
  const approvedUrls = new Set(approved.map((a) => normalizeUrl(a.originalUrl)));
  const approvedVideos = new Set(approved.map((a) => a.videoId).filter(Boolean) as string[]);

  let skippedApproved = 0;
  const seenUrls = new Set<string>();
  const seenVideos = new Set<string>();
  const deduped: MorningQueueItem[] = [];

  // Recall first so a shared URL stays in Already saved.
  const ordered = [
    ...filtered.filter((i) => i.source === 'recall'),
    ...filtered.filter((i) => i.source === 'miniflux'),
  ];

  for (const item of ordered) {
    const norm = normalizeUrl(item.url);
    const yt = item.youtubeId;
    if (approvedUrls.has(norm) || (yt && approvedVideos.has(yt))) {
      skippedApproved += 1;
      continue;
    }
    if (seenUrls.has(norm) || (yt && seenVideos.has(yt))) continue;
    seenUrls.add(norm);
    if (yt) seenVideos.add(yt);
    deduped.push(item);
    if (deduped.length >= VOLUME_CAP) break;
  }

  return {
    items: deduped,
    usedFixture,
    liveMiniflux: liveMiniflux.length,
    liveRecall: liveRecall.length,
    skippedApproved,
    skippedExcluded,
    busy: deduped.length >= 10,
    generatedAt: new Date().toISOString(),
  };
}
