import { Calendar, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function ArticleCard({ article }: { article: any }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6 hover:border-purple-500/40 transition-all hover:shadow-xl hover:shadow-purple-500/10">
      <Link href={`/article/${article.id}`}>
        <h3 className="text-xl font-bold text-white mb-3 hover:text-purple-400 transition-colors line-clamp-2">
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
        {article.publishedAt && (
          <span className="flex items-center text-gray-500 text-sm">
            <Calendar className="w-3 h-3 mr-1" />
            {new Date(article.publishedAt).toLocaleDateString()}
          </span>
        )}
        <Link
          href={`/article/${article.id}`}
          className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
        >
          Read More →
        </Link>
      </div>
    </div>
  );
}
