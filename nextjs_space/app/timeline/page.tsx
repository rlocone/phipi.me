import { prisma } from '@/lib/db';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import PublicHeader from '@/app/home/_components/public-header';

export const metadata = {
  title: 'Timeline | phipi',
  description: 'Browse articles chronologically',
};

export const dynamic = 'force-dynamic';

function calculateReadingTime(content: string | null): number {
  if (!content) return 3;
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export default async function TimelinePage() {
  const articles = await prisma.article.findMany({
    where: { status: 'APPROVED' },
    select: {
      id: true,
      title: true,
      emoji: true,
      createdAt: true,
      aiSummary: true,
      rawContent: true,
      thumbnailUrl: true,
      featuredImage: true,
      categories: {
        select: { category: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // Group articles by date
  const groupedArticles: { [key: string]: typeof articles } = {};
  articles.forEach((article) => {
    const dateKey = format(new Date(article.createdAt), 'MMM d, yyyy');
    if (!groupedArticles[dateKey]) {
      groupedArticles[dateKey] = [];
    }
    groupedArticles[dateKey].push(article);
  });

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      <PublicHeader />
      
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-2">Timeline</h1>
          <div className="w-24 h-1 bg-purple-500 mx-auto rounded-full" />
          <p className="text-gray-400 mt-4">Browse articles chronologically</p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Center line */}
          <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-purple-500/80 via-purple-500/50 to-purple-500/20 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.5)]" />

          {/* Articles */}
          <div className="space-y-8">
            {Object.entries(groupedArticles).map(([date, dateArticles], groupIndex) => (
              <div key={date} className="relative">
                {/* Date node */}
                <div className="absolute left-1/2 transform -translate-x-1/2 -top-4 z-10">
                  <div className="bg-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-[0_0_20px_rgba(139,92,246,0.6)]">
                    {date}
                  </div>
                </div>

                {/* Articles for this date */}
                <div className="pt-12 space-y-6">
                  {dateArticles.map((article, index) => {
                    const isLeft = index % 2 === 0;
                    const imageUrl = article.featuredImage || article.thumbnailUrl;
                    const category = article.categories[0]?.category?.name || 'Tech';
                    const readingTime = calculateReadingTime(article.rawContent || article.aiSummary);

                    return (
                      <div
                        key={article.id}
                        className={`flex items-center gap-4 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
                      >
                        {/* Card */}
                        <div className={`w-[calc(50%-2rem)] ${isLeft ? 'pr-4' : 'pl-4'}`}>
                          <Link href={`/article/${article.id}`}>
                            <div className="group bg-[#1a1a2e] rounded-xl overflow-hidden border border-purple-500/20 hover:border-purple-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.2)]">
                              <div className="flex gap-4 p-4">
                                {/* Thumbnail */}
                                {imageUrl && (
                                  <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
                                    <Image
                                      src={imageUrl}
                                      alt={article.title}
                                      fill
                                      className="object-cover"
                                      sizes="96px"
                                    />
                                  </div>
                                )}
                                {!imageUrl && (
                                  <div className="w-24 h-24 flex-shrink-0 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-900/20 flex items-center justify-center">
                                    <span className="text-3xl">{article.emoji || '📰'}</span>
                                  </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  {/* Title with emoji */}
                                  <h3 className="text-white font-semibold group-hover:text-purple-400 transition-colors line-clamp-2 text-sm leading-tight mb-2">
                                    {article.emoji && <span className="mr-1">{article.emoji}</span>}
                                    {article.title}
                                  </h3>

                                  {/* Meta */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                                      {category}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {readingTime} min read
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        </div>

                        {/* Timeline dot */}
                        <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-purple-500 rounded-full border-4 border-[#0f0f1a] shadow-[0_0_10px_rgba(139,92,246,0.8)]" />

                        {/* Spacer for other side */}
                        <div className="w-[calc(50%-2rem)]" />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {articles.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400">No articles yet. Check back soon!</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} phipi | Love of Tech
        </div>
      </footer>
    </div>
  );
}
