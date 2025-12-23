'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Link as LinkIcon,
  Loader2,
  FileText,
  Sparkles,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ProcessingStep = 'idle' | 'fetching' | 'summary' | 'fullPost' | 'tags' | 'complete' | 'error';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Tag {
  id: string;
  name: string;
}

export default function SubmitArticlePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
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
  
  // Video-specific fields
  const [isVideo, setIsVideo] = useState(false);
  const [videoId, setVideoId] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [channelName, setChannelName] = useState('');
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  
  // Image fields
  const [images, setImages] = useState<string[]>([]);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, []);

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

  const processUrl = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setError('');
    setStep('fetching');

    try {
      // Step 1: Fetch and extract content
      const fetchRes = await fetch('/api/articles/process-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!fetchRes.ok) {
        const data = await fetchRes.json();
        throw new Error(data.error || 'Failed to fetch article');
      }

      const responseData = await fetchRes.json();
      const { 
        title: extractedTitle, 
        content, 
        isVideo: videoFlag,
        videoId: vid,
        thumbnailUrl: thumb,
        channelName: channel,
        publishedAt: pubDate,
        images: extractedImages,
        featuredImage: extractedFeatured,
      } = responseData;
      
      setTitle(extractedTitle);
      setRawContent(content);
      
      // Set video-specific fields if it's a YouTube video
      if (videoFlag) {
        setIsVideo(true);
        setVideoId(vid || '');
        setThumbnailUrl(thumb || '');
        setChannelName(channel || '');
        setPublishedAt(pubDate || null);
        setImages([]);
        setFeaturedImage(null);
      } else {
        setIsVideo(false);
        setVideoId('');
        setThumbnailUrl('');
        setChannelName('');
        setPublishedAt(null);
        setImages(extractedImages || []);
        setFeaturedImage(extractedFeatured || null);
      }

      // Step 2: Generate AI summary
      setStep('summary');
      await generateSummary(content, extractedTitle);

      // Step 3: Generate AI full post
      setStep('fullPost');
      await generateFullPost(content, extractedTitle);

      // Step 4: Generate tags
      setStep('tags');
      await generateTags(content, extractedTitle);

      setStep('complete');
    } catch (error: any) {
      console.error('Error processing URL:', error);
      setError(error?.message || 'Failed to process URL');
      setStep('error');
    }
  };

  const generateSummary = async (content: string, title: string) => {
    const res = await fetch('/api/articles/generate-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title }),
    });

    if (!res.ok) throw new Error('Failed to generate summary');

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
  };

  const generateFullPost = async (content: string, title: string) => {
    const res = await fetch('/api/articles/generate-full-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title }),
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
  };

  const generateTags = async (content: string, title: string) => {
    const res = await fetch('/api/articles/generate-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title }),
    });

    if (!res.ok) throw new Error('Failed to generate tags');

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
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
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            if (parsed.status === 'completed' && parsed.result?.tags) {
              setSelectedTagNames(parsed.result.tags);
              return;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  };

  const handleSubmit = async () => {
    if (!title || !url) {
      setError('Title and URL are required');
      return;
    }

    setError('');
    try {
      // Create/get tags
      const tagIds: string[] = [];
      for (const tagName of selectedTagNames) {
        const res = await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: tagName }),
        });
        const data = await res.json();
        tagIds.push(data.tag?.id);
      }

      // Create article
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          originalUrl: url,
          rawContent,
          aiSummary,
          aiFullPost,
          categoryIds: selectedCategoryIds,
          tagIds,
          isVideo,
          videoId: isVideo ? videoId : undefined,
          thumbnailUrl: isVideo ? thumbnailUrl : undefined,
          channelName: isVideo ? channelName : undefined,
          publishedAt: publishedAt || undefined,
          images: !isVideo ? images : undefined,
          featuredImage: !isVideo ? featuredImage : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create article');
      }

      router.push('/admin/review');
    } catch (error: any) {
      console.error('Error creating article:', error);
      setError(error?.message || 'Failed to create article');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Submit Article</h1>
        <p className="text-gray-400">Add a new article from URL with AI-powered content generation</p>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6 space-y-6">
        {/* URL Input */}
        <div>
          <Label htmlFor="url" className="text-gray-300">
            Article URL
          </Label>
          <div className="flex gap-2 mt-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10 bg-gray-900/50 border-purple-500/30 text-white"
                placeholder="https://example.com/article"
                disabled={step !== 'idle' && step !== 'error' && step !== 'complete'}
              />
            </div>
            <Button
              onClick={processUrl}
              disabled={step !== 'idle' && step !== 'error' && step !== 'complete'}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {step === 'idle' || step === 'complete' || step === 'error' ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Process URL
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Processing Status */}
        {(step !== 'idle' && step !== 'complete' && step !== 'error') && (
          <div className="bg-purple-600/10 border border-purple-500/30 rounded-md p-4">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
              <div>
                <p className="text-white font-medium">
                  {step === 'fetching' && 'Fetching article content...'}
                  {step === 'summary' && 'Generating AI summary...'}
                  {step === 'fullPost' && 'Generating enhanced post...'}
                  {step === 'tags' && 'Auto-generating tags...'}
                </p>
                <p className="text-sm text-gray-400">Please wait, this may take a moment</p>
              </div>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="bg-green-600/10 border border-green-500/30 rounded-md p-4">
            <div className="flex items-center space-x-3">
              <Check className="w-5 h-5 text-green-400" />
              <p className="text-white font-medium">Content processed successfully!</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-600/10 border border-red-500/30 rounded-md p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Title */}
        {title && (
          <div>
            <Label htmlFor="title" className="text-gray-300">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 bg-gray-900/50 border-purple-500/30 text-white"
            />
          </div>
        )}

        {/* Video Thumbnail Preview */}
        {isVideo && thumbnailUrl && (
          <div className="bg-gray-900/30 border border-purple-500/20 rounded-lg p-4">
            <Label className="text-gray-300 mb-2 block">YouTube Video</Label>
            <div className="aspect-video w-full max-w-lg mx-auto bg-gray-900 rounded-lg overflow-hidden">
              <img 
                src={thumbnailUrl} 
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
            {channelName && (
              <p className="text-sm text-gray-400 mt-2 text-center">
                Channel: {channelName}
              </p>
            )}
            {publishedAt && (
              <p className="text-sm text-gray-400 mt-1 text-center">
                Published: {new Date(publishedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Article Images Preview */}
        {!isVideo && images.length > 0 && (
          <div className="bg-gray-900/30 border border-purple-500/20 rounded-lg p-4">
            <Label className="text-gray-300 mb-3 block">Extracted Images ({images.length})</Label>
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
          </div>
        )}

        {/* No Images Warning */}
        {!isVideo && step === 'complete' && images.length === 0 && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 text-center">
            <AlertCircle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-yellow-500 text-sm">
              No images found in the article. Consider adding images manually or using AI generation.
            </p>
          </div>
        )}

        {/* AI Summary */}
        {aiSummary && (
          <div>
            <Label htmlFor="summary" className="text-gray-300">
              AI Summary
            </Label>
            <Textarea
              id="summary"
              value={aiSummary}
              onChange={(e) => setAiSummary(e.target.value)}
              className="mt-2 bg-gray-900/50 border-purple-500/30 text-white min-h-[100px]"
            />
          </div>
        )}

        {/* AI Full Post */}
        {aiFullPost && (
          <div>
            <Label htmlFor="fullPost" className="text-gray-300">
              AI-Enhanced Full Post
            </Label>
            <Textarea
              id="fullPost"
              value={aiFullPost}
              onChange={(e) => setAiFullPost(e.target.value)}
              className="mt-2 bg-gray-900/50 border-purple-500/30 text-white min-h-[300px]"
            />
          </div>
        )}

        {/* Categories */}
        {step === 'complete' && (
          <div>
            <Label className="text-gray-300">Categories</Label>
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
        )}

        {/* Tags */}
        {selectedTagNames?.length > 0 && (
          <div>
            <Label className="text-gray-300">Auto-Generated Tags</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedTagNames.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-purple-600/20 border border-purple-500/30 rounded-full text-sm text-purple-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        {step === 'complete' && (
          <div className="flex justify-end space-x-4">
            <Button
              variant="outline"
              onClick={() => {
                setUrl('');
                setTitle('');
                setRawContent('');
                setAiSummary('');
                setAiFullPost('');
                setSelectedCategoryIds([]);
                setSelectedTagNames([]);
                setStep('idle');
                setError('');
              }}
              className="border-purple-500/30 text-gray-300 hover:bg-purple-600/20"
            >
              Reset
            </Button>
            <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700">
              <FileText className="w-4 h-4 mr-2" />
              Save Article
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
