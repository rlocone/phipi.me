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
      'OS/2 was IBM\u2019s ambitious PC operating system — technically strong, but it lost the desktop war to Microsoft Windows and faded from mainstream use. Lingering Warp-class systems still turned up in legacy deployments: NYC MTA MetroCard systems long ran on OS/2; ATMs were a famous Warp install base; and ArcaOS (Arca Noae) still supports Warp 4.52-based deployments for enterprises that never left.',
    additionalReading: [
      {
        title: 'Subway History: How OS/2 Powered The NYC Subway For Decades',
        url: 'https://tedium.co/2019/06/13/nyc-subway-os2-history/',
        description:
          'Tedium on OS/2 as the quiet backbone of MetroCard — still running while MetroCards were accepted.',
      },
      {
        title: 'The MTA MetroCard System Runs on OS/2',
        url: 'https://stephen.nyc/2025/03/the-mta-metrocard-system-runs-on-os-2/',
        description: '2025 recap of why MetroCard\u2019s stack stuck with OS/2 for decades.',
      },
      {
        title: 'Arca Noae FAQ: Is OS/2 still being used today?',
        url: 'https://www.arcanoae.com/faq/',
        description:
          'Arca Noae on enterprises, ATMs, and industrial users still on OS/2-class systems; ArcaOS continues Warp 4.52 support.',
      },
    ],
  },
  {
    id: 'napster-rise-fall',
    title: 'The Rise and Fall of Napster, the Teenage Startup That Broke the Music Industry',
    videoId: 'Id-FnpJiYF8',
    channelName: 'Tech District',
    originalUrl: 'https://youtu.be/Id-FnpJiYF8',
    thumbnailUrl: 'https://i.ytimg.com/vi/Id-FnpJiYF8/hqdefault.jpg',
    summary:
      'Napster launched in 1999 from Shawn Fanning (with Sean Parker) as an easy peer-to-peer MP3 sharing network with a central index — it peaked around early 2001 with tens of millions of users and upended the record industry. RIAA lawsuits and the Ninth Circuit\u2019s A&M Records v. Napster rulings forced filtering; the original service shut down in July 2001 and the company later filed for bankruptcy.',
    additionalReading: [
      {
        title: 'The Short History of Napster 1.0',
        url: 'https://www.wired.com/2013/04/napster/',
        description:
          'WIRED timeline of Napster\u2019s rise, peak users, Metallica suit, and July 2001 shutdown.',
      },
      {
        title: 'Oversharing: how Napster nearly killed the music industry',
        url: 'https://www.theguardian.com/music/2019/may/31/napster-twenty-years-music-revolution',
        description:
          'The Guardian on Napster\u2019s 20-year mark — discovery without payment, and the legal squeeze.',
      },
      {
        title: 'Ashes to ashes, peer to peer: An oral history of Napster',
        url: 'https://fortune.com/2013/09/05/ashes-to-ashes-peer-to-peer-an-oral-history-of-napster/',
        description:
          'Fortune oral history from people who lived Napster\u2019s first years and collapse.',
      },
    ],
  },
  {
    id: 'limewire-rise-fall',
    title: 'The Rise and Fall of LimeWire, the Download App Every College Laptop Had Until Lawyers Shut It Down',
    videoId: 'SzBaH1bdDmI',
    channelName: 'Empire Circuit',
    originalUrl: 'https://youtu.be/SzBaH1bdDmI',
    thumbnailUrl: 'https://i.ytimg.com/vi/SzBaH1bdDmI/hqdefault.jpg',
    summary:
      'LimeWire (released 2000 by Lime Wire LLC / Mark Gorton) was a popular Gnutella-based P2P client that let users search and share files long after Napster fell. In 2010 Judge Kimba Wood found LimeWire liable for inducing copyright infringement; a permanent injunction that October disabled its search/download/upload trading features and effectively shut the service down.',
    additionalReading: [
      {
        title: 'LimeWire sliced by RIAA, liable for massive infringement',
        url: 'https://arstechnica.com/tech-policy/2010/05/major-copyright-defeat-tastes-sour-for-limewire/',
        description:
          'Ars Technica on the May 2010 summary judgment finding LimeWire induced infringement.',
      },
      {
        title: 'Sour ruling for LimeWire as court says to turn off P2P functionality',
        url: 'https://arstechnica.com/tech-policy/2010/10/sour-ruling-for-limewire-as-court-says-to-turn-off-p2p-functionality/',
        description:
          'Ars on the Oct 2010 injunction forcing LimeWire to disable P2P features.',
      },
      {
        title: 'US court shuts down LimeWire music-sharing service',
        url: 'https://www.reuters.com/article/business/us-court-shuts-down-limewire-music-sharing-service-idUSN26162124/',
        description:
          'Reuters on Judge Wood\u2019s permanent injunction shutting LimeWire\u2019s file-sharing service.',
      },
    ],
  },
];
