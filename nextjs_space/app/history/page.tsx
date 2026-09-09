import PublicHeader from '@/app/home/_components/public-header';
import { historyCatalog } from '@/lib/history-catalog';
import { gloriaPublicByline, publishedAtEtIso } from '@/lib/gloria-byline';
import { BookOpen, ExternalLink } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'History | phipi',
  description:
    'Tech history on phipi — curated videos about the machines, software, and moments that shaped computing.',
  openGraph: {
    title: 'History | phipi',
    description:
      'Tech history on phipi — curated videos about the machines, software, and moments that shaped computing.',
    url: 'https://phipi.me/history',
    siteName: 'phipi',
    type: 'website',
  },
};

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900">
      <PublicHeader />

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <BookOpen className="w-12 h-12 text-purple-500" />
          </div>
          <h1 className="text-4xl font-bold text-white">History</h1>
          <div className="w-24 h-1 bg-purple-500 mx-auto rounded-full" />
          <p className="text-gray-400 max-w-2xl mx-auto">
            Curated tech history — the machines, software, and moments that shaped how we compute.
          </p>
        </div>

        <div className="space-y-10">
          {historyCatalog.map((item) => {
            const byline = gloriaPublicByline(item.publishedAt);
            const datetime = publishedAtEtIso(item.publishedAt);

            return (
              <article
                key={item.id}
                className="bg-[#1a1a2e]/80 rounded-2xl overflow-hidden border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]"
              >
                <div className="aspect-video w-full bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${item.videoId}`}
                    title={item.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>

                <div className="p-6 space-y-3">
                  <h2 className="text-2xl font-semibold text-white leading-snug">
                    {item.title}
                  </h2>

                  <p className="text-sm text-purple-300">{item.channelName}</p>

                  {item.summary && (
                    <p className="text-gray-400 text-sm leading-relaxed">{item.summary}</p>
                  )}

                  {item.additionalReading && item.additionalReading.length > 0 && (
                    <div className="bg-gray-900/50 border border-purple-500/20 rounded-lg p-6 mt-2">
                      <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-purple-400" />
                        Additional Reading
                      </h3>
                      <p className="text-gray-400 mb-4 text-sm">
                        Explore these related sources for more in-depth information on this topic.
                      </p>
                      <div className="space-y-3">
                        {item.additionalReading.slice(0, 3).map((reading, index) => {
                          const safeHref =
                            typeof reading.url === 'string' && /^https:\/\//i.test(reading.url)
                              ? reading.url
                              : undefined;
                          let hostname = '';
                          try {
                            hostname = safeHref ? new URL(safeHref).hostname : '';
                          } catch {
                            hostname = '';
                          }

                          return (
                            <a
                              key={`${reading.url}-${index}`}
                              href={safeHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-purple-500/30 rounded-lg p-4 transition-all group"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-purple-600/20 text-purple-300 rounded-full flex items-center justify-center text-sm font-semibold">
                                  {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-white font-semibold mb-1 group-hover:text-purple-300 transition-colors">
                                    {reading.title}
                                  </h4>
                                  {reading.description && (
                                    <p className="text-gray-400 text-sm line-clamp-2 mb-2">
                                      {reading.description}
                                    </p>
                                  )}
                                  {hostname && (
                                    <div className="flex items-center gap-1 text-purple-400 text-sm">
                                      <ExternalLink className="w-3 h-3" />
                                      <span className="truncate">{hostname}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    {datetime ? (
                      <time dateTime={datetime}>{byline}</time>
                    ) : (
                      byline
                    )}
                  </p>

                  <Link
                    href={item.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Watch on YouTube
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {historyCatalog.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400">No history entries yet. Check back soon!</p>
          </div>
        )}
      </main>

      <footer className="bg-gray-900/90 border-t border-purple-500/20 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            © {new Date().getFullYear()} phipi | Love of Tech. Powered by AI and passion for
            technology.
          </p>
        </div>
      </footer>
    </div>
  );
}
