import { Calendar, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import prisma from '@/lib/db';
import PublicHeader from '@/app/home/_components/public-header';
import ShareButtons from '@/app/home/_components/share-buttons';
import ReactMarkdown from 'react-markdown';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

// Generate dynamic metadata for social media sharing
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const article = await prisma.article.findUnique({
    where: { id: params.id },
    include: {
      categories: { include: { category: true } },
    },
  });

  if (!article || article.status !== 'APPROVED') {
    return {
      title: 'Article Not Found',
      description: 'The requested article could not be found.',
    };
  }

  // Get the best image for social media preview
  const socialImage = article.isVideo && article.thumbnailUrl 
    ? article.thumbnailUrl 
    : article.featuredImage || '/og-image.png';

  // Get description from AI summary or truncate raw content
  const description = article.aiSummary 
    || (article.rawContent?.substring(0, 160) + '...') 
    || 'Read the full article on phipi | Love of Tech';

  // Get categories for keywords
  const categories = article.categories?.map((c: any) => c.category.name).join(', ') || 'Technology';

  return {
    title: `${article.title} | phipi`,
    description,
    keywords: categories,
    openGraph: {
      title: article.title,
      description,
      type: 'article',
      url: `/article/${article.id}`,
      siteName: 'phipi | Love of Tech',
      publishedTime: article.publishedAt?.toISOString(),
      authors: ['phipi'],
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description,
      images: [socialImage],
    },
  };
}

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const article = await prisma.article.findUnique({
    where: { id: params.id },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
  });

  if (!article || article.status !== 'APPROVED') {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900">
      <PublicHeader />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <Link
          href="/home"
          className="flex items-center text-purple-400 hover:text-purple-300 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <article className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-8 shadow-2xl">
          <h1 className="text-4xl font-bold text-white mb-6">{article.title}</h1>

          <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-purple-500/20">
            {article.categories?.map?.((cat: any, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1 bg-purple-600/30 border border-purple-500/40 rounded-full text-sm text-purple-300 font-medium"
              >
                {cat.category?.name}
              </span>
            ))}
            {article.publishedAt && (
              <span className="flex items-center text-gray-400 text-sm">
                <Calendar className="w-4 h-4 mr-2" />
                {new Date(article.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>

          {article.isVideo && article.videoId && (
            <div className="mb-8">
              <div className="aspect-video w-full bg-gray-900 rounded-lg overflow-hidden shadow-2xl border border-purple-500/20">
                <iframe
                  src={`https://www.youtube.com/embed/${article.videoId}`}
                  title={article.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              {article.channelName && (
                <p className="text-sm text-gray-400 mt-4 flex items-center justify-center gap-2">
                  <span className="font-medium text-purple-400">Channel:</span> {article.channelName}
                </p>
              )}
            </div>
          )}

          {!article.isVideo && article.featuredImage && (
            <div className="mb-8">
              <div className="relative aspect-video w-full bg-gray-900 rounded-lg overflow-hidden shadow-2xl border border-purple-500/20">
                <img 
                  src={article.featuredImage}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {!article.isVideo && article.images && article.images.length > 1 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-purple-400 mb-4">Gallery</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {article.images.filter((img: string) => img !== article.featuredImage).map((imgUrl: string, index: number) => (
                  <div key={index} className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-lg border border-purple-500/20 hover:border-purple-500/50 transition-colors">
                    <img 
                      src={imgUrl}
                      alt={`${article.title} - Image ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {article.aiSummary && (
            <div className="bg-purple-600/10 border border-purple-500/30 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-bold text-purple-400 mb-2">Summary</h2>
              <p className="text-gray-300 leading-relaxed">{article.aiSummary}</p>
            </div>
          )}

          {(article.aiFullPost || article.rawContent) && (
            <div className="prose prose-invert prose-purple max-w-none mb-8">
              {article.aiFullPost ? (
                <div className="text-gray-300 leading-relaxed">
                  <ReactMarkdown>{article.aiFullPost}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {article.rawContent}
                </p>
              )}
            </div>
          )}
          
          {article.isVideo && !article.aiFullPost && !article.rawContent && (
            <div className="bg-purple-600/10 border border-purple-500/30 rounded-lg p-6 mb-8 text-center">
              <p className="text-gray-400">Watch the video above for full content</p>
            </div>
          )}

          {article.tags?.length > 0 && (
            <div className="mb-8 pb-8 border-b border-purple-500/20">
              <h3 className="text-sm font-bold text-gray-400 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag: any, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-gray-700/50 border border-gray-600/30 rounded-full text-sm text-gray-300"
                  >
                    {tag.tag?.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <a
              href={article.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-purple-400 hover:text-purple-300 transition-colors font-medium"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Read Original Article
            </a>
            <div>
              <ShareButtons article={article} />
            </div>
          </div>
        </article>
      </main>

      <footer className="bg-gray-900/90 border-t border-purple-500/20 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">© 2024 phipi | Love of Tech. Powered by AI and passion for technology.</p>
        </div>
      </footer>
    </div>
  );
}
