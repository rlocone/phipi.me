export type HistoryItem = {
  id: string;
  title: string;
  videoId: string;
  channelName: string;
  originalUrl: string;
  thumbnailUrl: string;
  /** ISO datetime when known; omit rather than inventing a time */
  publishedAt?: string;
  summary?: string;
};

/**
 * Static History catalog (v1).
 * Append new videos here — no Prisma change required.
 */
export const historyCatalog: HistoryItem[] = [
  {
    id: 'windows-95-start-menu',
    title: 'What Happened to Windows 95? The OS That Put the Start Menu on Every PC',
    videoId: 'lSRxce3guuY',
    channelName: 'America\u2019s Lost Technology',
    originalUrl: 'https://youtu.be/lSRxce3guuY',
    thumbnailUrl: 'https://i.ytimg.com/vi/lSRxce3guuY/hqdefault.jpg',
    summary:
      'A look back at Windows 95 — the OS that put the Start menu on every PC and reshaped personal computing.',
  },
];
