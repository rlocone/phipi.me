import { Star, Calendar, ExternalLink, Clock } from 'lucide-react';
import Link from 'next/link';
import ShareButtons from './share-buttons';
import { calculateReadingTime } from '@/lib/emoji-suggester';

export default function StarredArticle({ article }: { article: any }) {
  const content = article.aiFullPost || article.rawContent || article.aiSummary || '';
  const readingTime = calculateReadingTime(content);

  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-gray-800/40 backdrop-blur-sm border border-purple-500/30 rounded-xl overflow-hidden shadow-2xl">
      {article.isVideo && article.thumbnailUrl && (
        <Link href={`/article/${article.id}`}>
          <div className="relative aspect-video w-full bg-gray-900 overflow-hidden group">
            <img 
              src={article.thumbnailUrl} 
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors flex items-center justify-center">
              <div className="w-20 h-20 bg-purple-600/90 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          </div>
        </Link>
      )}

      {!article.isVideo && article.featuredImage && (
        <Link href={`/article/${article.id}`}>
          <div className="relative aspect-video w-full bg-gray-900 overflow-hidden group">
            <img 
              src={article.featuredImage} 
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-400 font-bold text-sm">Featured Article</span>
              </div>
            </div>
          </div>
        </Link>
      )}
      
      <div className="p-8">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
          <span className="text-yellow-400 font-bold">Featured Article</span>
        </div>

        <Link href={`/article/${article.id}`}>
          <h2 className="text-3xl font-bold text-white mb-4 hover:text-purple-400 transition-colors">
            {article.emoji && <span className="mr-3">{article.emoji}</span>}
            {article.title}
          </h2>
        </Link>

        {article.aiSummary && (
          <p className="text-lg text-gray-300 mb-6 leading-relaxed">{article.aiSummary}</p>
        )}

        <div className="flex flex-wrap items-center gap-4 mb-4">
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
              <Calendar className="w-4 h-4 mr-1" />
              {new Date(article.publishedAt).toLocaleDateString()}
            </span>
          )}
          <span className="flex items-center text-gray-400 text-sm">
            <Clock className="w-4 h-4 mr-1" />
            {readingTime} min read
          </span>
        </div>

        <div className="flex gap-4">
          <Link href={`/article/${article.id}`}>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md font-medium transition-colors">
              Read Full Article
            </button>
          </Link>
          <a
            href={article.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-purple-400 hover:text-purple-300 transition-colors"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Original
          </a>
          <div className="ml-auto">
            <ShareButtons article={article} />
          </div>
        </div>
      </div>
    </div>
  );
}
