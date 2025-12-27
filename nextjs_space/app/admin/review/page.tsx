'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Star, StarOff, Trash2, Clock, ExternalLink, Loader2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface Article {
  id: string;
  title: string;
  emoji?: string;
  originalUrl: string;
  aiSummary?: string;
  status: string;
  isStarred: boolean;
  createdAt: string;
  isVideo?: boolean;
  videoId?: string;
  thumbnailUrl?: string;
  channelName?: string;
  categories: Array<{ category: { name: string; slug: string } }>;
  tags: Array<{ tag: { name: string } }>;
}

export default function ReviewPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'approved'>('all');

  useEffect(() => {
    fetchArticles();
  }, [filter]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const url = filter === 'all' ? '/api/articles' : `/api/articles?status=${filter.toUpperCase()}`;
      const res = await fetch(url);
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error('Failed to fetch articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await fetch(`/api/articles/${id}/approve`, { method: 'POST' });
      fetchArticles();
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleToggleStar = async (id: string) => {
    try {
      await fetch(`/api/articles/${id}/star`, { method: 'POST' });
      fetchArticles();
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      fetchArticles();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Review Content</h1>
        <p className="text-gray-400">Manage and approve articles</p>
      </div>

      <div className="flex space-x-2">
        {['all', 'draft', 'approved'].map((f) => (
          <Button
            key={f}
            onClick={() => setFilter(f as any)}
            className={filter === f ? 'bg-purple-600' : 'bg-gray-700'}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {articles?.map?.((article) => (
            <div key={article.id} className="bg-gray-800/50 border border-purple-500/20 rounded-lg overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {article.isVideo && article.thumbnailUrl && (
                  <div className="md:w-64 flex-shrink-0">
                    <div className="relative aspect-video bg-gray-900">
                      <img 
                        src={article.thumbnailUrl} 
                        alt={article.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-12 h-12 bg-purple-600/80 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between flex-1 p-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">
                        {article.emoji && <span className="mr-2">{article.emoji}</span>}
                        {article.title}
                      </h3>
                      {article.isStarred && <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />}
                      <Badge className="bg-purple-600/20">{article.status}</Badge>
                    </div>
                    {article.aiSummary && <p className="text-gray-400 mb-3 line-clamp-2">{article.aiSummary}</p>}
                    <a href={article.originalUrl} target="_blank" className="text-purple-400 text-sm flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> View original
                    </a>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button onClick={() => router.push(`/admin/edit/${article.id}`)} size="sm" className="bg-purple-600">
                      <Edit className="w-4 h-4 mr-2" /> Edit
                    </Button>
                    {article.status === 'DRAFT' && (
                      <Button onClick={() => handleApprove(article.id)} size="sm" className="bg-green-600">
                        <CheckCircle className="w-4 h-4 mr-2" /> Approve
                      </Button>
                    )}
                    <Button onClick={() => handleToggleStar(article.id)} size="sm" variant="outline">
                      {article.isStarred ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                    </Button>
                    <Button onClick={() => handleDelete(article.id)} size="sm" variant="outline">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
