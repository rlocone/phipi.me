'use client';
import { useState, useEffect } from 'react';
import { FolderOpen, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      setName('');
      setDescription('');
      setShowAdd(false);
      fetchCategories();
    } catch (error) {
      console.error('Failed to add category:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      fetchCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Categories</h1>
          <p className="text-gray-400">Organize your content</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="bg-purple-600">
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </div>

      {showAdd && (
        <div className="bg-gray-800/50 border border-purple-500/20 rounded-lg p-6 space-y-4">
          <div>
            <Label className="text-gray-300">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 bg-gray-900/50 border-purple-500/30 text-white"
            />
          </div>
          <div>
            <Label className="text-gray-300">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 bg-gray-900/50 border-purple-500/30 text-white"
            />
          </div>
          <Button onClick={handleAdd} className="bg-purple-600">
            Add Category
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {categories?.map?.((cat) => (
            <div key={cat.id} className="bg-gray-800/50 border border-purple-500/20 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{cat.name}</h3>
                  <p className="text-gray-400">{cat.description}</p>
                  <p className="text-sm text-gray-500 mt-2">{cat._count?.articles || 0} articles</p>
                </div>
                <Button onClick={() => handleDelete(cat.id)} size="sm" variant="outline">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
