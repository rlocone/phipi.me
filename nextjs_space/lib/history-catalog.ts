export type HistoryReading = {
  title: string;
  url: string;
  description?: string;
};

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
  /** Up to 3 related articles shown under the video */
  additionalReading?: HistoryReading[];
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
      'A look back at Windows 95 — the OS that put the Start menu on every PC and reshaped personal computing. US air traffic control has still been running systems on Windows 95 and floppy disks (plus paper strips), and the FAA has been working to retire that stack.',
    additionalReading: [
      {
        title: 'US air traffic control still runs on Windows 95 and floppy disks',
        url: 'https://arstechnica.com/information-technology/2025/06/faa-to-retire-floppy-disks-and-windows-95-amid-air-traffic-control-overhaul/',
        description:
          'Ars Technica on FAA plans to replace Win95/floppy ATC systems after Rocheleau\u2019s House testimony.',
      },
      {
        title: 'FAA finally replacing floppy disks and Windows 95 in air traffic control systems',
        url: 'https://www.techspot.com/news/108229-faa-finally-replacing-floppy-disks-windows-95-air.html',
        description: 'TechSpot on why legacy ATC gear persists and the push to modernize.',
      },
      {
        title: "'No more floppy disks': Air traffic control overhaul faces some daunting obstacles",
        url: 'https://www.npr.org/2025/06/06/nx-s1-5424682/air-traffic-control-overhaul',
        description:
          'NPR on Win95, floppies, paper strips still in towers, and modernization hurdles.',
      },
    ],
  },
  {
    id: 'ibm-os2-pc-war',
    title: 'What Happened to OS/2? IBM\u2019s Operating System That Lost the PC War',
    videoId: 'qdwsw_kO56o',
    channelName: 'America\u2019s Lost Technology',
    originalUrl: 'https://youtu.be/qdwsw_kO56o',
    thumbnailUrl: 'https://i.ytimg.com/vi/qdwsw_kO56o/hqdefault.jpg',
    summary:
      'OS/2 was IBM\u2019s ambitious PC operating system — technically strong, but it lost the desktop war to Microsoft Windows and faded from mainstream use.',
  },
];
