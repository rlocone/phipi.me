import { Calendar, ExternalLink, Clock } from 'lucide-react';
import Link from 'next/link';
import { calculateReadingTime } from '@/lib/emoji-suggester';

export default function ArticleCard({ article }: { article: any }) {
  const content = article.aiFullPost || article.rawContent || article.aiSummary || '';
  const readingTime = calculateReadingTime(content);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg overflow-hidden hover:border-purple-500/40 transition-all hover:shadow-xl hover:shadow-purple-500/10">
      {article.isVideo && article.thumbnailUrl && (
        <Link href={`/article/${article.id}`}>
          <div className="relative aspect-video w-full bg-gray-900 overflow-hidden group">
            <img 
              src={article.thumbnailUrl} 
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors flex items-center justify-center">
              <div className="w-16 h-16 bg-purple-600/90 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>
      )}
      
      <div className="p-6">
        <Link href={`/article/${article.id}`}>
          <h3 className="text-xl font-bold text-white mb-3 hover:text-purple-400 transition-colors line-clamp-2">
            {article.emoji && <span className="mr-2">{article.emoji}</span>}
            {article.title}
          </h3>
        </Link>

        {article.aiSummary && (
          <p className="text-gray-400 mb-4 line-clamp-3">{article.aiSummary}</p>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {article.categories?.slice(0, 2).map?.((cat: any, idx: number) => (
            <span
              key={idx}
              className="px-2 py-1 bg-purple-600/20 border border-purple-500/30 rounded text-xs text-purple-300"
            >
              {cat.category?.name}
            </span>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3 text-gray-500 text-sm">
            {article.publishedAt && (
              <span className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(article.publishedAt).toLocaleDateString()}
              </span>
            )}
            <span className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {readingTime} min
            </span>
          </div>
          <Link
            href={`/article/${article.id}`}
            className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
          >
            Read More →
          </Link>
        </div>
      </div>
    </div>
  );
}
