import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://phipi.me'),
  title: 'phipi | Love of Tech - Content Hub',
  description: 'Your trusted source for cybersecurity, privacy, hardware, and AI news',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'phipi | Love of Tech - Content Hub',
    description: 'Your trusted source for cybersecurity, privacy, hardware, and AI news',
    siteName: 'phipi | Love of Tech',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'phipi | Love of Tech',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'phipi | Love of Tech - Content Hub',
    description: 'Your trusted source for cybersecurity, privacy, hardware, and AI news',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="phipi | Love of Tech RSS Feed"
          href="/api/feed"
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
