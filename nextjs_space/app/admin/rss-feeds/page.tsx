'use client';
import { useState, useEffect } from 'react';
import { Rss, Plus, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RSSFeedsPage() {
  const [feeds, setFeeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    try {
      const res = await fetch('/api/rss-feeds');
      const data = await res.json();
      setFeeds(data.feeds || []);
    } catch (error) {
      console.error('Failed to fetch feeds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      await fetch('/api/rss-feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, feedUrl: url }),
      });
      setName('');
      setUrl('');
      setShowAdd(false);
      fetchFeeds();
    } catch (error) {
      console.error('Failed to add feed:', error);
    }
  };

  const handleFetch = async (id: string) => {
    try {
      await fetch(`/api/rss-feeds/${id}/fetch`, { method: 'POST' });
      alert('RSS feed fetched successfully!');
      fetchFeeds();
    } catch (error) {
      console.error('Failed to fetch feed:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this feed?')) return;
    try {
      await fetch(`/api/rss-feeds/${id}`, { method: 'DELETE' });
      fetchFeeds();
    } catch (error) {
      console.error('Failed to delete feed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">RSS Feeds</h1>
          <p className="text-gray-400">Manage your content sources</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="bg-purple-600">
          <Plus className="w-4 h-4 mr-2" /> Add Feed
        </Button>
      </div>

      {showAdd && (
        <div className="bg-gray-800/50 border border-purple-500/20 rounded-lg p-6 space-y-4">
          <div>
            <Label className="text-gray-300">Feed Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 bg-gray-900/50 border-purple-500/30 text-white"
              placeholder="TechCrunch"
            />
          </div>
          <div>
            <Label className="text-gray-300">Feed URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-2 bg-gray-900/50 border-purple-500/30 text-white"
              placeholder="https://techcrunch.com/feed/"
            />
          </div>
          <Button onClick={handleAdd} className="bg-purple-600">
            Add Feed
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {feeds?.map?.((feed) => (
            <div key={feed.id} className="bg-gray-800/50 border border-purple-500/20 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{feed.name}</h3>
                  <p className="text-sm text-gray-400 break-all">{feed.feedUrl}</p>
                  {feed.lastFetchedAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Last fetched: {new Date(feed.lastFetchedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleFetch(feed.id)} size="sm" className="bg-purple-600">
                    <RefreshCw className="w-4 h-4 mr-2" /> Fetch
                  </Button>
                  <Button onClick={() => handleDelete(feed.id)} size="sm" variant="outline">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
