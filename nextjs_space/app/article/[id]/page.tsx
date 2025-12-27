import { Calendar, ExternalLink, ArrowLeft, Clock, BookOpen } from 'lucide-react';
import Link from 'next/link';
import prisma from '@/lib/db';
import PublicHeader from '@/app/home/_components/public-header';
import ShareButtons from '@/app/home/_components/share-buttons';
import ReactMarkdown from 'react-markdown';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { calculateReadingTime } from '@/lib/emoji-suggester';

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

  const emoji = article.emoji || '';
  const title = emoji ? `${emoji} ${article.title}` : article.title;

  return {
    title: `${title} | phipi`,
    description,
    keywords: categories,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `/article/${article.id}`,
      siteName: 'phipi | Love of Tech',
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
      title,
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
      sources: {
        where: { approved: true },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!article || article.status !== 'APPROVED') {
    notFound();
  }

  // Calculate reading time
  const content = article.aiFullPost || article.rawContent || '';
  const readingTime = calculateReadingTime(content);

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <PublicHeader />
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Button */}
        <Link
          href="/home"
          className="inline-flex items-center text-purple-400 hover:text-purple-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Articles
        </Link>

        {/* Hero Section */}
        {!article.isVideo && article.featuredImage && (
          <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden mb-8">
            <img
              src={article.featuredImage}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {article.isVideo && article.videoId && (
          <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden mb-8">
            <iframe
              src={`https://www.youtube.com/embed/${article.videoId}`}
              title={article.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        )}

        {/* Title with Emoji */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          {article.emoji && <span className="mr-3">{article.emoji}</span>}
          {article.title}
        </h1>

        {/* Metadata Bar */}
        <div className="flex flex-wrap items-center gap-4 mb-8 text-gray-400 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <time dateTime={article.publishedAt?.toISOString() || article.createdAt.toISOString()}>
              {(article.publishedAt || article.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{readingTime} min read</span>
          </div>

          {article.channelName && (
            <div className="flex items-center gap-2">
              <span className="text-purple-400">{article.channelName}</span>
            </div>
          )}
        </div>

        {/* Categories and Tags */}
        <div className="flex flex-wrap gap-3 mb-8">
          {article.categories.map(({ category }) => (
            <Link
              key={category.id}
              href={`/home?category=${category.slug}`}
              className="px-4 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-full text-sm transition-colors border border-purple-500/30"
            >
              {category.name}
            </Link>
          ))}
        </div>

        {/* AI Summary */}
        {article.aiSummary && (
          <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-purple-300 mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Summary
            </h2>
            <p className="text-gray-300 leading-relaxed">{article.aiSummary}</p>
          </div>
        )}

        {/* Main Content */}
        <article className="prose prose-invert prose-purple max-w-none mb-12">
          {article.isVideo && !article.aiFullPost && !article.rawContent ? (
            <div className="text-center py-8 text-gray-400">
              <p>Watch the video above to learn more about this topic.</p>
            </div>
          ) : (
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mb-4 mt-8 text-white" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mb-3 mt-6 text-white" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-xl font-bold mb-2 mt-4 text-white" {...props} />,
                p: ({ node, ...props }) => <p className="mb-4 text-gray-300 leading-relaxed" {...props} />,
                a: ({ node, ...props }) => (
                  <a className="text-purple-400 hover:text-purple-300 underline" target="_blank" rel="noopener noreferrer" {...props} />
                ),
                ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 text-gray-300 space-y-2" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 text-gray-300 space-y-2" {...props} />,
                code: ({ node, ...props }) => <code className="bg-gray-800 px-2 py-1 rounded text-purple-300 text-sm" {...props} />,
                pre: ({ node, ...props }) => (
                  <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto mb-4" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-purple-500 pl-4 italic text-gray-400 my-4" {...props} />
                ),
              }}
            >
              {article.aiFullPost || article.rawContent || ''}
            </ReactMarkdown>
          )}
        </article>

        {/* Additional Reading Sources */}
        {article.sources && article.sources.length > 0 && (
          <div className="bg-gray-900/50 border border-purple-500/20 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-400" />
              Additional Reading
            </h2>
            <p className="text-gray-400 mb-4 text-sm">
              Explore these related sources for more in-depth information on this topic.
            </p>
            <div className="space-y-3">
              {article.sources.map((source, index) => (
                <a
                  key={source.id}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-purple-500/30 rounded-lg p-4 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-600/20 text-purple-300 rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold mb-1 group-hover:text-purple-300 transition-colors">
                        {source.title}
                      </h3>
                      {source.description && (
                        <p className="text-gray-400 text-sm line-clamp-2 mb-2">{source.description}</p>
                      )}
                      <div className="flex items-center gap-1 text-purple-400 text-sm">
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate">{new URL(source.url).hostname}</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Topics</h3>
            <div className="flex flex-wrap gap-2">
              {article.tags.map(({ tag }) => (
                <span
                  key={tag.id}
                  className="px-3 py-1 bg-gray-800 text-gray-300 rounded-md text-sm"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Share Section */}
        <div className="border-t border-gray-800 pt-8">
          <h3 className="text-lg font-semibold text-white mb-4">Share this article</h3>
          <ShareButtons article={article} />
        </div>

        {/* Original Source */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <a
            href={article.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View original source
          </a>
        </div>
      </main>
    </div>
  );
}
