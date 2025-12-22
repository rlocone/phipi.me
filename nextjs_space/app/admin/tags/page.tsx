'use client';
import { useState, useEffect } from 'react';
import { Tags, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TagsPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/tags');
      const data = await res.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      setName('');
      setShowAdd(false);
      fetchTags();
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tag?')) return;
    try {
      await fetch(`/api/tags/${id}`, { method: 'DELETE' });
      fetchTags();
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Tags</h1>
          <p className="text-gray-400">Manage content tags</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="bg-purple-600">
          <Plus className="w-4 h-4 mr-2" /> Add Tag
        </Button>
      </div>

      {showAdd && (
        <div className="bg-gray-800/50 border border-purple-500/20 rounded-lg p-6">
          <Label className="text-gray-300">Tag Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 bg-gray-900/50 border-purple-500/30 text-white mb-4"
          />
          <Button onClick={handleAdd} className="bg-purple-600">
            Add Tag
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {tags?.map?.((tag) => (
            <div
              key={tag.id}
              className="bg-gray-800/50 border border-purple-500/20 rounded-lg px-4 py-3 flex items-center gap-3"
            >
              <span className="text-white font-medium">{tag.name}</span>
              <span className="text-xs text-gray-500">({tag._count?.articles || 0})</span>
              <button
                onClick={() => handleDelete(tag.id)}
                className="text-gray-400 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
