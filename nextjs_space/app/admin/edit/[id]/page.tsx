'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Link as LinkIcon,
  Loader2,
  FileText,
  Sparkles,
  Check,
  AlertCircle,
  Image as ImageIcon,
  RefreshCw,
  Save,
  Smile,
  BookOpen,
  Plus,
  Trash2,
  ExternalLink,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { suggestEmoji, getEmojiSuggestions } from '@/lib/emoji-suggester';

interface AdditionalSource {
  id: string;
  title: string;
  url: string;
  description: string | null;
  approved: boolean;
  order: number;
}

type ProcessingStep = 'idle' | 'loading' | 'regenerating' | 'saving' | 'complete' | 'error';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Tag {
  id: string;
  name: string;
}

interface Article {
  id: string;
  title: string;
  emoji?: string | null;
  originalUrl: string;
  rawContent: string | null;
  aiSummary: string | null;
  aiFullPost: string | null;
  status: string;
  isStarred: boolean;
  isVideo: boolean;
  videoId: string | null;
  thumbnailUrl: string | null;
  channelName: string | null;
  publishedAt: string | null;
  images: string[];
  featuredImage: string | null;
  categories: Array<{ category: { id: string; name: string; slug: string } }>;
  tags: Array<{ tag: { id: string; name: string } }>;
}

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiFullPost, setAiFullPost] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [step, setStep] = useState<ProcessingStep>('idle');
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Emoji fields
  const [emoji, setEmoji] = useState('');
  const [emojiSuggestions, setEmojiSuggestions] = useState<string[]>([]);

  // Video-specific fields
  const [isVideo, setIsVideo] = useState(false);
  const [videoId, setVideoId] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [channelName, setChannelName] = useState('');
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  // Image fields
  const [images, setImages] = useState<string[]>([]);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);

  // Sources fields
  const [sources, setSources] = useState<AdditionalSource[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [newSource, setNewSource] = useState({ title: '', url: '', description: '' });
  const [showAddSource, setShowAddSource] = useState(false);

  useEffect(() => {
    fetchArticle();
    fetchCategories();
    fetchTags();
    fetchSources();
  }, [articleId]);

  const fetchArticle = async () => {
    setStep('loading');
    try {
      const res = await fetch(`/api/articles/${articleId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch article');
      }
      const data = await res.json();
      const art = data.article as Article;

      setArticle(art);
      setTitle(art.title);
      setRawContent(art.rawContent || '');
      setAiSummary(art.aiSummary || '');
      setAiFullPost(art.aiFullPost || '');
      setIsVideo(art.isVideo);
      setVideoId(art.videoId || '');
      setThumbnailUrl(art.thumbnailUrl || '');
      setChannelName(art.channelName || '');
      setPublishedAt(art.publishedAt);
      setImages(art.images || []);
      setFeaturedImage(art.featuredImage);
      setSelectedCategoryIds(art.categories.map(c => c.category.id));
      setSelectedTagNames(art.tags.map(t => t.tag.name));
      
      // Set emoji or suggest one if missing
      if (art.emoji) {
        setEmoji(art.emoji);
      } else {
        // Suggest an emoji based on title and category
        const categorySlug = art.categories?.[0]?.category?.slug;
        const suggestedEmoji = suggestEmoji(art.title, categorySlug);
        setEmoji(suggestedEmoji.emoji);
      }
      
      // Get emoji suggestions for alternatives
      const categorySlug = art.categories?.[0]?.category?.slug;
      const suggestions = getEmojiSuggestions(art.title, categorySlug);
      setEmojiSuggestions(suggestions);

      setStep('idle');
    } catch (error: any) {
      console.error('Error fetching article:', error);
      setError(error?.message || 'Failed to load article');
      setStep('error');
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/tags');
      const data = await res.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const fetchSources = async () => {
    try {
      const res = await fetch(`/api/articles/${articleId}/sources`);
      const data = await res.json();
      setSources(data.sources || []);
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    }
  };

  const generateSources = async () => {
    setIsLoadingSources(true);
    setError('');
    try {
      const res = await fetch('/api/articles/fetch-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: rawContent || aiFullPost }),
      });

      if (!res.ok) throw new Error('Failed to generate sources');

      const data = await res.json();
      const newSources = (data.sources || []).map((s: any, idx: number) => ({
        id: `new-${Date.now()}-${idx}`,
        title: s.title,
        url: s.url,
        description: s.description || '',
        approved: false,
        order: sources.length + idx,
      }));
      setSources([...sources, ...newSources]);
    } catch (error: any) {
      console.error('Error generating sources:', error);
      setError(error?.message || 'Failed to generate sources');
    } finally {
      setIsLoadingSources(false);
    }
  };

  const handleAddSource = () => {
    if (!newSource.title.trim() || !newSource.url.trim()) {
      setError('Source title and URL are required');
      return;
    }
    
    const source: AdditionalSource = {
      id: `new-${Date.now()}`,
      title: newSource.title.trim(),
      url: newSource.url.trim(),
      description: newSource.description.trim() || null,
      approved: false,
      order: sources.length,
    };
    
    setSources([...sources, source]);
    setNewSource({ title: '', url: '', description: '' });
    setShowAddSource(false);
  };

  const handleRemoveSource = (sourceId: string) => {
    setSources(sources.filter(s => s.id !== sourceId));
  };

  const handleToggleSourceApproval = (sourceId: string) => {
    setSources(sources.map(s => 
      s.id === sourceId ? { ...s, approved: !s.approved } : s
    ));
  };

  const handleUpdateSource = (sourceId: string, field: keyof AdditionalSource, value: any) => {
    setSources(sources.map(s => 
      s.id === sourceId ? { ...s, [field]: value } : s
    ));
  };

  const saveSources = async () => {
    try {
      await fetch(`/api/articles/${articleId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources }),
      });
    } catch (error) {
      console.error('Error saving sources:', error);
    }
  };

  const regenerateSummary = async () => {
    if (!rawContent && !aiFullPost) {
      setError('No content available to generate summary');
      return;
    }

    setError('');
    setStep('regenerating');

    try {
      const content = aiFullPost || rawContent;
      const res = await fetch('/api/articles/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate summary');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let summary = '';
      let partialRead = '';

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        partialRead += decoder.decode(value, { stream: true });
        let lines = partialRead.split('\n');
        partialRead = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setAiSummary(summary.trim());
              setStep('idle');
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              summary += content;
              setAiSummary(summary);
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      setStep('idle');
    } catch (error: any) {
      console.error('Error regenerating summary:', error);
      setError(error?.message || 'Failed to regenerate summary');
      setStep('error');
    }
  };

  const regenerateFullPost = async () => {
    if (!rawContent) {
      setError('No raw content available');
      return;
    }

    setError('');
    setStep('regenerating');

    try {
      const res = await fetch('/api/articles/generate-full-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: rawContent, title }),
      });

      if (!res.ok) throw new Error('Failed to generate full post');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullPost = '';
      let partialRead = '';

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        partialRead += decoder.decode(value, { stream: true });
        let lines = partialRead.split('\n');
        partialRead = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setAiFullPost(fullPost.trim());
              setStep('idle');
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              fullPost += content;
              setAiFullPost(fullPost);
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      setStep('idle');
    } catch (error: any) {
      console.error('Error regenerating full post:', error);
      setError(error?.message || 'Failed to regenerate full post');
      setStep('error');
    }
  };

  const regenerateTags = async () => {
    const content = aiFullPost || rawContent;
    if (!content) {
      setError('No content available to generate tags');
      return;
    }

    setError('');
    setStep('regenerating');

    try {
      const res = await fetch('/api/articles/generate-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title }),
      });

      if (!res.ok) throw new Error('Failed to generate tags');

      const data = await res.json();
      setSelectedTagNames(data.tags || []);
      setStep('idle');
    } catch (error: any) {
      console.error('Error generating tags:', error);
      setError(error?.message || 'Failed to generate tags');
      setStep('error');
    }
  };

  const findMoreImages = async () => {
    setError('');
    setStep('regenerating');

    try {
      const res = await fetch('/api/articles/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: rawContent || aiFullPost, count: 5 }),
      });

      const data = await res.json();

      if (!res.ok) {
        // If no images found, open Google Images search
        const searchQuery = encodeURIComponent(`${title} technology`);
        window.open(`https://www.google.com/search?q=${searchQuery}&tbm=isch`, '_blank');
        setError('Opened image search in new tab. Download images and add them manually.');
        setStep('idle');
        return;
      }

      if (data.images && data.images.length > 0) {
        setImages([...images, ...data.images]);
      }

      setStep('idle');
    } catch (error: any) {
      console.error('Error finding images:', error);
      setError(error?.message || 'Failed to find images');
      setStep('error');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (selectedCategoryIds.length === 0) {
      setError('Please select at least one category');
      return;
    }

    setError('');
    setStep('saving');

    try {
      const res = await fetch(`/api/articles/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          emoji: emoji || null,
          rawContent: rawContent || null,
          aiSummary: aiSummary || null,
          aiFullPost: aiFullPost || null,
          categoryIds: selectedCategoryIds,
          tagNames: selectedTagNames,
          images: images || [],
          featuredImage: featuredImage || null,
          isVideo,
          videoId: videoId || null,
          thumbnailUrl: thumbnailUrl || null,
          channelName: channelName || null,
          publishedAt: publishedAt || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update article');
      }

      // Also save sources
      await saveSources();

      setStep('complete');
      setTimeout(() => {
        router.push('/admin/review');
      }, 1500);
    } catch (error: any) {
      console.error('Error saving article:', error);
      setError(error?.message || 'Failed to save article');
      setStep('error');
    }
  };

  const handleRemoveTag = (tagName: string) => {
    setSelectedTagNames(selectedTagNames.filter(t => t !== tagName));
  };

  const handleAddTag = (tagName: string) => {
    if (tagName && !selectedTagNames.includes(tagName)) {
      setSelectedTagNames([...selectedTagNames, tagName]);
    }
  };

  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
        <p className="text-gray-400">Loading article...</p>
      </div>
    );
  }

  if (step === 'error' && !article) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Article</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={() => router.push('/admin/review')} variant="outline">
            Back to Review
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Edit Article</h1>
        <p className="text-gray-400">Update article content, categories, and tags</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
          <AlertCircle className="w-5 h-5 inline mr-2" />
          {error}
        </div>
      )}

      {step === 'complete' && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 text-green-400">
          <Check className="w-5 h-5 inline mr-2" />
          Article updated successfully! Redirecting...
        </div>
      )}

      <div className="space-y-6">
        {/* Title */}
        <div>
          <Label htmlFor="title" className="text-gray-300">
            Title
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article title"
            className="mt-2 bg-gray-900/50 border-purple-500/30 text-white"
          />
        </div>

        {/* Emoji Selection */}
        {emoji && (
          <div className="bg-gray-900/30 border border-purple-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Smile className="w-5 h-5 text-purple-400" />
              <Label className="text-gray-300">Article Emoji</Label>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{emoji}</div>
                <div className="text-sm text-gray-400">
                  This emoji appears before the article title
                </div>
              </div>
              {emojiSuggestions.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Choose a different emoji:</p>
                  <div className="flex flex-wrap gap-2">
                    {emojiSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEmoji(suggestion)}
                        className={`text-3xl p-2 rounded-lg transition-all ${
                          emoji === suggestion
                            ? 'bg-purple-600/30 ring-2 ring-purple-500'
                            : 'bg-gray-800/50 hover:bg-gray-700/50'
                        }`}
                        title="Click to select"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-2">
                <Label htmlFor="customEmoji" className="text-gray-400 text-xs">
                  Or enter any emoji:
                </Label>
                <Input
                  id="customEmoji"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  className="mt-1 bg-gray-900/50 border-purple-500/20 text-white text-2xl text-center"
                  placeholder="Enter emoji"
                  maxLength={2}
                />
              </div>
            </div>
          </div>
        )}

        {/* Video Preview */}
        {isVideo && videoId && (
          <div className="bg-gray-900/30 border border-purple-500/20 rounded-lg p-4">
            <Label className="text-gray-300 mb-3 block">Video Preview</Label>
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
              {thumbnailUrl && (
                <img
                  src={thumbnailUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="w-16 h-16 bg-purple-600/80 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
            {channelName && (
              <p className="text-sm text-gray-400 mt-2">
                Channel: {channelName}
              </p>
            )}
            {publishedAt && (
              <p className="text-sm text-gray-400 mt-1">
                Published: {new Date(publishedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Article Images */}
        {!isVideo && (
          <div className="bg-gray-900/30 border border-purple-500/20 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <Label className="text-gray-300">Images ({images.length})</Label>
              <div className="flex gap-2">
                {featuredImage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFeaturedImage(null)}
                    className="text-gray-400 hover:text-white"
                    disabled={step === 'regenerating' || step === 'saving'}
                  >
                    Clear Featured
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={findMoreImages}
                  disabled={step === 'regenerating' || step === 'saving'}
                  className="text-purple-400 border-purple-500/30"
                >
                  {step === 'regenerating' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <><ImageIcon className="w-4 h-4 mr-2" /> Find More</>
                  )}
                </Button>
              </div>
            </div>

            {images.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((imgUrl, index) => (
                    <div
                      key={index}
                      className={`relative aspect-video bg-gray-900 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        featuredImage === imgUrl
                          ? 'border-purple-500 ring-2 ring-purple-500/50'
                          : 'border-gray-700 hover:border-purple-500/50'
                      }`}
                      onClick={() => setFeaturedImage(imgUrl)}
                    >
                      <img
                        src={imgUrl}
                        alt={`Article image ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      {featuredImage === imgUrl && (
                        <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">
                          Featured
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-400 mt-3 text-center">
                  Click on an image to set it as the featured image
                </p>
              </>
            ) : (
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 text-center">
                <AlertCircle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                <p className="text-yellow-500 text-sm mb-3">
                  No images available for this article.
                </p>
                <p className="text-gray-400 text-xs">
                  Click "Find More" to search for images.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Raw Content */}
        <div>
          <Label htmlFor="rawContent" className="text-gray-300">
            Raw Content
          </Label>
          <Textarea
            id="rawContent"
            value={rawContent}
            onChange={(e) => setRawContent(e.target.value)}
            className="mt-2 bg-gray-900/50 border-purple-500/30 text-white min-h-[150px]"
            placeholder="Original article content"
          />
        </div>

        {/* AI Summary */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label htmlFor="aiSummary" className="text-gray-300">
              AI Summary
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={regenerateSummary}
              disabled={step === 'regenerating' || step === 'saving'}
              className="text-purple-400 border-purple-500/30"
            >
              {step === 'regenerating' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <><RefreshCw className="w-4 h-4 mr-2" /> Regenerate</>
              )}
            </Button>
          </div>
          <Textarea
            id="aiSummary"
            value={aiSummary}
            onChange={(e) => setAiSummary(e.target.value)}
            className="mt-2 bg-gray-900/50 border-purple-500/30 text-white min-h-[100px]"
            placeholder="AI-generated summary"
          />
        </div>

        {/* AI Full Post */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label htmlFor="aiFullPost" className="text-gray-300">
              AI-Enhanced Full Post
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={regenerateFullPost}
              disabled={step === 'regenerating' || step === 'saving'}
              className="text-purple-400 border-purple-500/30"
            >
              {step === 'regenerating' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <><RefreshCw className="w-4 h-4 mr-2" /> Regenerate</>
              )}
            </Button>
          </div>
          <Textarea
            id="aiFullPost"
            value={aiFullPost}
            onChange={(e) => setAiFullPost(e.target.value)}
            className="mt-2 bg-gray-900/50 border-purple-500/30 text-white min-h-[300px]"
            placeholder="AI-generated full article"
          />
        </div>

        {/* Categories */}
        <div>
          <Label className="text-gray-300">Category</Label>
          <Select
            value={selectedCategoryIds?.[0] || ''}
            onValueChange={(value) => setSelectedCategoryIds([value])}
          >
            <SelectTrigger className="mt-2 bg-gray-900/50 border-purple-500/30 text-white">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tags */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label className="text-gray-300">Tags</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={regenerateTags}
              disabled={step === 'regenerating' || step === 'saving'}
              className="text-purple-400 border-purple-500/30"
            >
              {step === 'regenerating' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <><RefreshCw className="w-4 h-4 mr-2" /> Regenerate</>
              )}
            </Button>
          </div>

          <div className="space-y-3">
            {/* Selected Tags */}
            {selectedTagNames.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTagNames.map((tagName) => (
                  <Badge
                    key={tagName}
                    className="bg-purple-600/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 flex items-center gap-2"
                  >
                    {tagName}
                    <button
                      onClick={() => handleRemoveTag(tagName)}
                      className="ml-1 hover:text-purple-100"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Add Tag Dropdown */}
            <Select onValueChange={handleAddTag}>
              <SelectTrigger className="bg-gray-900/50 border-purple-500/30 text-white">
                <SelectValue placeholder="Add a tag" />
              </SelectTrigger>
              <SelectContent>
                {tags
                  .filter((tag) => !selectedTagNames.includes(tag.name))
                  .map((tag) => (
                    <SelectItem key={tag.id} value={tag.name}>
                      {tag.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Additional Reading Sources */}
        <div className="bg-gray-900/30 border border-purple-500/20 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              <Label className="text-gray-300 text-lg">Additional Reading</Label>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddSource(true)}
                className="text-purple-400 border-purple-500/30"
              >
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateSources}
                disabled={isLoadingSources}
                className="text-purple-400 border-purple-500/30"
              >
                {isLoadingSources ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><Sparkles className="w-4 h-4 mr-1" /> Generate</>
                )}
              </Button>
            </div>
          </div>

          {/* Add New Source Form */}
          {showAddSource && (
            <div className="bg-gray-800/50 rounded-lg p-4 mb-4 space-y-3">
              <Input
                placeholder="Source title"
                value={newSource.title}
                onChange={(e) => setNewSource({ ...newSource, title: e.target.value })}
                className="bg-gray-900/50 border-purple-500/30 text-white"
              />
              <Input
                placeholder="URL (https://...)"
                value={newSource.url}
                onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                className="bg-gray-900/50 border-purple-500/30 text-white"
              />
              <Textarea
                placeholder="Brief description (optional)"
                value={newSource.description}
                onChange={(e) => setNewSource({ ...newSource, description: e.target.value })}
                className="bg-gray-900/50 border-purple-500/30 text-white min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddSource}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Add Source
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddSource(false);
                    setNewSource({ title: '', url: '', description: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Sources List */}
          {sources.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No additional reading sources yet. Generate or add some!
            </p>
          ) : (
            <div className="space-y-3">
              {sources.map((source, index) => (
                <div
                  key={source.id}
                  className={`bg-gray-800/50 rounded-lg p-3 border ${
                    source.approved ? 'border-green-500/30' : 'border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-gray-500 mt-1">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-purple-400 text-sm font-medium">[{index + 1}]</span>
                        <Input
                          value={source.title}
                          onChange={(e) => handleUpdateSource(source.id, 'title', e.target.value)}
                          className="bg-transparent border-none text-white font-medium p-0 h-auto focus-visible:ring-0"
                        />
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <ExternalLink className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        <Input
                          value={source.url}
                          onChange={(e) => handleUpdateSource(source.id, 'url', e.target.value)}
                          className="bg-transparent border-none text-blue-400 text-sm p-0 h-auto focus-visible:ring-0"
                        />
                      </div>
                      <Textarea
                        value={source.description || ''}
                        onChange={(e) => handleUpdateSource(source.id, 'description', e.target.value)}
                        placeholder="Add description..."
                        className="bg-gray-900/30 border-gray-700 text-gray-300 text-sm min-h-[40px] resize-none"
                      />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">Approved</span>
                        <Switch
                          checked={source.approved}
                          onCheckedChange={() => handleToggleSourceApproval(source.id)}
                          className="data-[state=checked]:bg-green-600"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSource(source.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-3">
            Only approved sources will be shown on the public article page.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={step === 'regenerating' || step === 'saving'}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            {step === 'saving' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
          <Button
            onClick={() => router.push('/admin/review')}
            variant="outline"
            disabled={step === 'regenerating' || step === 'saving'}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
