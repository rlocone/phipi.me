import { Shield, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import prisma from '@/lib/db';
import ArticleCard from './_components/article-card';
import StarredArticle from './_components/starred-article';
import PublicHeader from './_components/public-header';
import SearchBar from './_components/search-bar';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'phipi | Love of Tech',
  description: 'Your trusted source for cybersecurity, privacy, hardware, and AI insights. Discover the latest tech news and deep dives.',
  openGraph: {
    title: 'phipi | Love of Tech',
    description: 'Your trusted source for cybersecurity, privacy, hardware, and AI insights. Discover the latest tech news and deep dives.',
    url: 'https://phipi.me',
    siteName: 'phipi',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'phipi | Love of Tech',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'phipi | Love of Tech',
    description: 'Your trusted source for cybersecurity, privacy, hardware, and AI insights. Discover the latest tech news and deep dives.',
    images: ['/og-image.png'],
  },
};

export default async function HomePage() {
  const [starredArticle, articles, categories] = await Promise.all([
    prisma.article.findFirst({
      where: { isStarred: true, status: 'APPROVED' },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    }),
    prisma.article.findMany({
      where: { status: 'APPROVED', isStarred: false },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 12,
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900">
      <PublicHeader />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <Shield className="w-16 h-16 text-purple-500" />
          </div>
          <h1 className="text-5xl font-bold text-white">phipi | Love of Tech</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Your trusted source for cybersecurity, privacy, hardware, and AI insights
          </p>
        </div>

        {/* Search & Filters */}
        <SearchBar categories={categories} />

        {/* Starred Article */}
        {starredArticle && <StarredArticle article={starredArticle} />}

        {/* Articles Grid */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Latest Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles?.map?.((article: any) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900/90 border-t border-purple-500/20 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">© 2024 phipi | Love of Tech. Powered by AI and passion for technology.</p>
        </div>
      </footer>
    </div>
  );
}
