'use client';
import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function SearchBar({ categories }: { categories: any[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (selectedCategory) params.set('category', selectedCategory);
    router.push(`/home?${params.toString()}`);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 bg-gray-900/50 border-purple-500/30 text-white"
            placeholder="Search articles..."
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-gray-900/50 border border-purple-500/30 text-white rounded-md px-4"
        >
          <option value="">All Categories</option>
          {categories?.map?.((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
        <Button onClick={handleSearch} className="bg-purple-600 hover:bg-purple-700">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>
    </div>
  );
}
