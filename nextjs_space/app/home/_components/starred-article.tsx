import { Star, Calendar, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import ShareButtons from './share-buttons';

export default function StarredArticle({ article }: { article: any }) {
  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-gray-800/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-8 shadow-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
        <span className="text-yellow-400 font-bold">Featured Article</span>
      </div>

      <Link href={`/article/${article.id}`}>
        <h2 className="text-3xl font-bold text-white mb-4 hover:text-purple-400 transition-colors">
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
  );
}
