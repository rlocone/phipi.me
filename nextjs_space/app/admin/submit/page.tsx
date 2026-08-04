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
  Smile,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { suggestEmoji, getEmojiSuggestions } from '@/lib/emoji-suggester';
import { ProgressBar } from './_components/progress-bar';

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

interface BatchSubmission {
  url: string;
  title?: string;
  status: 'queued' | 'processing' | 'saved' | 'error';
  error?: string;
  processingLogId?: string;
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
  const [batchUrls, setBatchUrls] = useState('');
  const [batchSubmissions, setBatchSubmissions] = useState<BatchSubmission[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  
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
  
  // Additional sources
  const [additionalSources, setAdditionalSources] = useState<any[]>([]);
  const [fetchingSources, setFetchingSources] = useState(false);

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

  const extractUrls = (input: string) =>
    Array.from(
      new Set(
        (input.match(/https?:\/\/[^\s<>"')\]]+/gi) || [])
          .map((value) => value.replace(/[),.;]+$/g, '').trim())
          .filter(Boolean)
      )
    );

  const oneLineError = (value: unknown) =>
    String(value || 'Failed to process article').replace(/\s+/g, ' ').trim().slice(0, 240);

  const createProcessingLog = async (queueUrl: string) => {
    try {
      const res = await fetch('/api/article-processing-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: queueUrl, status: 'processing', stage: 'queued' }),
      });
      if (!res.ok) return undefined;
      const data = await res.json();
      return data.log?.id as string | undefined;
    } catch (logError) {
      console.error('Failed to create article processing log:', logError);
      return undefined;
    }
  };

  const updateProcessingLog = async (
    id: string | undefined,
    update: { title?: string; status?: string; stage?: string; errorMessage?: string; details?: unknown }
  ) => {
    if (!id) return;
    try {
      await fetch('/api/article-processing-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...update }),
      });
    } catch (logError) {
      console.error('Failed to update article processing log:', logError);
    }
  };

  const streamSseText = async (
    res: Response,
    onUpdate?: (text: string) => void
  ): Promise<string> => {
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let text = '';
    let partialRead = '';

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      partialRead += decoder.decode(value, { stream: true });
      let lines = partialRead.split('\n');
      partialRead = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') {
          return text.trim();
        }
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          text += content;
          if (onUpdate) onUpdate(text);
        } catch {
          // Skip invalid JSON
        }
      }
    }

    return text.trim();
  };

  const streamTagNames = async (res: Response): Promise<string[]> => {
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
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') {
          return [];
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'completed' && parsed.result?.tags) {
            return parsed.result.tags;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    return [];
  };

  const processArticleUrl = async (articleUrl: string) => {
    const fetchRes = await fetch('/api/articles/process-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: articleUrl }),
    });

    if (!fetchRes.ok) {
      const data = await fetchRes.json();
      throw new Error(data.error || 'Failed to fetch article');
    }

    const responseData = await fetchRes.json();
    return responseData;
  };

  const generateSummaryText = async (content: string, articleTitle: string) => {
    const res = await fetch('/api/articles/generate-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title: articleTitle }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to generate summary');
    }

    return streamSseText(res);
  };

  const generateFullPostText = async (content: string, articleTitle: string) => {
    const res = await fetch('/api/articles/generate-full-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title: articleTitle }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to generate full post');
    }

    return streamSseText(res);
  };

  const generateTagsText = async (content: string, articleTitle: string) => {
    const res = await fetch('/api/articles/generate-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title: articleTitle }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to generate tags');
    }

    return streamTagNames(res);
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

      // Step 5: Suggest emoji based on title and category
      suggestEmojiForArticle(extractedTitle);

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

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to generate summary');
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

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to generate full post');
    }

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

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to generate tags');
    }

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

  const suggestEmojiForArticle = (articleTitle: string) => {
    // Get the selected category name for better emoji suggestion
    const selectedCategory = categories.find(c => selectedCategoryIds.includes(c.id));
    const categorySlug = selectedCategory?.slug;
    
    // Suggest primary emoji
    const suggestedEmoji = suggestEmoji(articleTitle, categorySlug);
    setEmoji(suggestedEmoji.emoji);
    
    // Get alternative emoji suggestions
    const suggestions = getEmojiSuggestions(articleTitle, categorySlug);
    setEmojiSuggestions(suggestions);
  };

  // Map processing step to progress bar step (1-5)
  const getProgressStep = (): number => {
    if (step === 'idle' || step === 'error') return 1;
    if (step === 'fetching' || step === 'summary' || step === 'fullPost' || step === 'tags') return 2;
    if (step === 'complete' && !selectedCategoryIds.length) return 3;
    if (step === 'complete' && selectedCategoryIds.length) return 4;
    return 1;
  };

  // Calculate word counts
  const getWordCount = (text: string): number => {
    return text?.trim().split(/\s+/).filter(word => word.length > 0).length || 0;
  };

  // Get reading time
  const getReadingTime = (): number => {
    const words = getWordCount(aiFullPost || rawContent);
    return Math.ceil(words / 200); // Average reading speed: 200 words/min
  };

  // Fetch additional sources
  const fetchAdditionalSources = async () => {
    if (!title || !rawContent) return;
    
    setFetchingSources(true);
    try {
      const res = await fetch('/api/articles/fetch-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title,
          content: rawContent,
          originalUrl: url
        }),
      });

      if (!res.ok) throw new Error('Failed to fetch sources');

      const data = await res.json();
      setAdditionalSources(data.sources || []);
    } catch (error: any) {
      console.error('Error fetching sources:', error);
      setError(error?.message || 'Failed to fetch additional sources');
    } finally {
      setFetchingSources(false);
    }
  };

  const handleBatchSubmit = async () => {
    const urls = extractUrls(batchUrls);

    if (urls.length === 0) {
      setError('Paste one or more article URLs to queue');
      return;
    }

    setError('');
    setBatchProcessing(true);
    setBatchSubmissions(urls.map((queueUrl) => ({ url: queueUrl, status: 'queued' })));

    try {
      for (let index = 0; index < urls.length; index += 1) {
        const queueUrl = urls[index];
        setBatchSubmissions((current) =>
          current.map((item, itemIndex) =>
            itemIndex === index
              ? { ...item, status: 'processing', error: undefined }
              : item
          )
        );

        let processingLogId: string | undefined;
        let processingStage = 'queued';
        try {
          processingLogId = await createProcessingLog(queueUrl);
          setBatchSubmissions((current) =>
            current.map((item, itemIndex) =>
              itemIndex === index ? { ...item, processingLogId } : item
            )
          );

          processingStage = 'fetch';
          await updateProcessingLog(processingLogId, { stage: processingStage });
          const extracted = await processArticleUrl(queueUrl);
          const articleTitle = extracted.title || 'Untitled';
          const content = extracted.content || '';
          await updateProcessingLog(processingLogId, { title: articleTitle, stage: 'summary' });

          const summary = await generateSummaryText(content, articleTitle);
          processingStage = 'full-post';
          await updateProcessingLog(processingLogId, { stage: processingStage });
          const fullPost = await generateFullPostText(content, articleTitle);
          processingStage = 'tags';
          await updateProcessingLog(processingLogId, { stage: processingStage });
          const batchTags = await generateTagsText(content, articleTitle);

          const tagIds: string[] = [];
          for (const tagName of batchTags) {
            const res = await fetch('/api/tags', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: tagName }),
            });
            const data = await res.json();
            if (data.tag?.id) {
              tagIds.push(data.tag.id);
            }
          }

          const createRes = await fetch('/api/articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: articleTitle,
              originalUrl: extracted.originalUrl || queueUrl,
              rawContent: content,
              aiSummary: summary,
              aiFullPost: fullPost,
              categoryIds: selectedCategoryIds,
              tagIds,
              emoji: suggestEmoji(articleTitle, categories.find((cat) => selectedCategoryIds.includes(cat.id))?.slug).emoji,
              isVideo: extracted.isVideo,
              videoId: extracted.isVideo ? extracted.videoId : undefined,
              thumbnailUrl: extracted.isVideo ? extracted.thumbnailUrl : undefined,
              channelName: extracted.isVideo ? extracted.channelName : undefined,
              publishedAt: extracted.publishedAt || undefined,
              images: !extracted.isVideo ? extracted.images : undefined,
              featuredImage: !extracted.isVideo ? extracted.featuredImage : undefined,
            }),
          });

          if (!createRes.ok) {
            const data = await createRes.json().catch(() => ({}));
            throw new Error(data.error || 'Failed to create article');
          }

          await updateProcessingLog(processingLogId, {
            title: articleTitle,
            status: 'saved',
            stage: 'saved',
          });
          setBatchSubmissions((current) =>
            current.map((item, itemIndex) =>
              itemIndex === index
                ? { ...item, title: articleTitle, status: 'saved' }
                : item
            )
          );
        } catch (batchError: any) {
          const errorMessage = oneLineError(batchError?.message);
          await updateProcessingLog(processingLogId, {
            status: 'error',
            stage: processingStage,
            errorMessage,
          });
          setBatchSubmissions((current) =>
            current.map((item, itemIndex) =>
              itemIndex === index
                ? {
                    ...item,
                    status: 'error',
                    error: errorMessage,
                  }
                : item
            )
          );
        }
      }
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleBatchFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setBatchUrls(text);
    event.target.value = '';
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
          emoji: emoji || undefined,
          isVideo,
          videoId: isVideo ? videoId : undefined,
          thumbnailUrl: isVideo ? thumbnailUrl : undefined,
          channelName: isVideo ? channelName : undefined,
          publishedAt: publishedAt || undefined,
          images: !isVideo ? images : undefined,
          featuredImage: !isVideo ? featuredImage : undefined,
          sources: additionalSources.length > 0 ? additionalSources : undefined,
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Submit Article</h1>
        <p className="text-gray-400">Add a new article from URL with AI-powered content generation</p>
      </div>

      {/* Batch Queue */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6 space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Batch Queue</h2>
            <p className="text-sm text-gray-400">
              Paste one or more article URLs and process them sequentially through the same submit flow.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleBatchSubmit}
            disabled={batchProcessing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {batchProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Queuing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Queue URLs
              </>
            )}
          </Button>
        </div>
        <Textarea
          value={batchUrls}
          onChange={(e) => setBatchUrls(e.target.value)}
          className="min-h-[140px] bg-gray-900/50 border-purple-500/30 text-white"
          placeholder="Paste one URL per line, or a markdown list of story links."
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center rounded-md border border-purple-500/30 bg-purple-600/10 px-3 py-2 text-sm text-purple-300 hover:bg-purple-600/20">
            Load markdown file
            <input
              type="file"
              accept=".md,.markdown,.txt"
              className="hidden"
              onChange={handleBatchFileUpload}
            />
          </label>
          <p className="text-xs text-gray-500">A .md or .txt file with URLs will be parsed into the queue box.</p>
        </div>
        {batchSubmissions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{batchSubmissions.length} queued</span>
              <span>
                {batchSubmissions.filter((item) => item.status === 'saved').length} saved ·{' '}
                {batchSubmissions.filter((item) => item.status === 'error').length} errors
              </span>
            </div>
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {batchSubmissions.map((item, index) => (
                <div
                  key={`${item.url}-${index}`}
                  className="rounded-lg border border-purple-500/10 bg-gray-900/40 p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-white">{item.title || item.url}</p>
                      <p className="truncate text-xs text-gray-400">{item.url}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                        item.status === 'saved'
                          ? 'bg-green-600/20 text-green-300'
                          : item.status === 'error'
                          ? 'bg-red-600/20 text-red-300'
                          : item.status === 'processing'
                          ? 'bg-purple-600/20 text-purple-300'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  {item.error && (
                    <p
                      className="mt-2 truncate whitespace-nowrap text-xs text-red-300"
                      title={item.error}
                    >
                      {item.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg px-6 py-4">
        <ProgressBar currentStep={getProgressStep()} />
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content (60%) */}
        <div className="lg:col-span-2 space-y-6">
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

        {/* Tabbed Content */}
        {step === 'complete' && (
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-900/50 border border-purple-500/20">
              <TabsTrigger 
                value="content" 
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                📝 Content
              </TabsTrigger>
              <TabsTrigger 
                value="media" 
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                🖼️ Media
              </TabsTrigger>
              <TabsTrigger 
                value="preview" 
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                👁️ Preview
              </TabsTrigger>
            </TabsList>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-6 mt-6">
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
                        This emoji will appear before your article title
                      </div>
                    </div>
                    {emojiSuggestions.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Or choose a different emoji:</p>
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

              {/* AI Summary */}
              {aiSummary && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor="summary" className="text-gray-300">
                      AI Summary
                    </Label>
                    <span className="text-xs text-purple-400 bg-purple-600/20 px-2 py-1 rounded">
                      {getWordCount(aiSummary)} words
                    </span>
                  </div>
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
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor="fullPost" className="text-gray-300">
                      AI-Enhanced Full Post
                    </Label>
                    <span className="text-xs text-purple-400 bg-purple-600/20 px-2 py-1 rounded">
                      {getWordCount(aiFullPost)} words
                    </span>
                  </div>
                  <Textarea
                    id="fullPost"
                    value={aiFullPost}
                    onChange={(e) => setAiFullPost(e.target.value)}
                    className="mt-2 bg-gray-900/50 border-purple-500/30 text-white min-h-[300px]"
                  />
                </div>
              )}
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="space-y-6 mt-6">
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
                  <div className="flex justify-between items-center mb-3">
                    <Label className="text-gray-300">Extracted Images ({images.length})</Label>
                    <div className="flex gap-2">
                      {featuredImage && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFeaturedImage(null)}
                          className="text-gray-400 hover:text-white"
                        >
                          Clear Featured
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setImages([])}
                        className="text-gray-400 hover:text-white"
                      >
                        Skip Images
                      </Button>
                    </div>
                  </div>
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
              {!isVideo && images.length === 0 && (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex flex-col items-center text-center">
                    <AlertCircle className="w-6 h-6 text-yellow-500 mb-2" />
                    <p className="text-yellow-500 text-sm mb-3">
                      No images found in the article source.
                    </p>
                    <p className="text-gray-400 text-xs mb-4">
                      You can proceed without images, or manually search for and add images related to "{title}"
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const searchQuery = encodeURIComponent(`${title} technology`);
                        window.open(`https://www.google.com/search?q=${searchQuery}&tbm=isch`, '_blank');
                      }}
                      className="text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
                    >
                      Search for Images
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="space-y-6 mt-6">
              <div className="bg-gray-900/30 border border-purple-500/20 rounded-lg p-6">
                <div className="prose prose-invert max-w-none">
                  {emoji && <span className="text-4xl mr-2">{emoji}</span>}
                  <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
                  {aiSummary && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-purple-400 mb-2">Summary</h3>
                      <p className="text-gray-300 text-sm leading-relaxed">{aiSummary}</p>
                    </div>
                  )}
                  {aiFullPost && (
                    <div>
                      <h3 className="text-lg font-semibold text-purple-400 mb-2">Full Article</h3>
                      <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{aiFullPost}</div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
          </div>
        </div>

        {/* Right Column - Sidebar (40%) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Info Dashboard */}
          {step === 'complete' && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-5 lg:sticky lg:top-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                  <span className="text-gray-400 text-sm">Reading Time</span>
                  <span className="text-purple-400 font-semibold">{getReadingTime()} min</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                  <span className="text-gray-400 text-sm">Original Words</span>
                  <span className="text-purple-400 font-semibold">{getWordCount(rawContent).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                  <span className="text-gray-400 text-sm">Enhanced Words</span>
                  <span className="text-purple-400 font-semibold">{getWordCount(aiFullPost).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                  <span className="text-gray-400 text-sm">Images</span>
                  <span className="text-purple-400 font-semibold">{isVideo ? '1 video' : `${images.length} images`}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <span className="text-gray-400 text-sm">Status</span>
                  <span className="text-green-400 font-semibold text-xs">Ready to Submit</span>
                </div>
              </div>
            </div>
          )}

          {/* Categories & Tags Card */}
          {step === 'complete' && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-5 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Article Metadata</h3>
                
                {/* Categories */}
                <div className="mb-4">
                  <Label className="text-gray-300 text-sm">Category</Label>
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
                {selectedTagNames?.length > 0 && (
                  <div>
                    <Label className="text-gray-300 text-sm">Auto-Generated Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedTagNames.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-purple-600/20 border border-purple-500/30 rounded-full text-xs text-purple-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-700 space-y-3">
                <Button 
                  onClick={handleSubmit} 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Save Article
                </Button>
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
                    setAdditionalSources([]);
                  }}
                  className="w-full border-purple-500/30 text-gray-300 hover:bg-purple-600/20"
                >
                  Reset
                </Button>
              </div>
            </div>
          )}

          {/* Additional Sources Card */}
          {step === 'complete' && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Additional Reading</h3>
              
              {additionalSources.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm mb-4">
                    Fetch related sources to enhance your article
                  </p>
                  <Button
                    onClick={fetchAdditionalSources}
                    disabled={fetchingSources}
                    className="w-full bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-300"
                  >
                    {fetchingSources ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Fetching Sources...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Fetch Sources
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {additionalSources.map((source, idx) => (
                    <div key={idx} className="p-3 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-purple-500/50 transition-colors">
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-purple-400 hover:text-purple-300 font-medium line-clamp-1"
                      >
                        {source.title}
                      </a>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {source.description}
                      </p>
                    </div>
                  ))}
                  <Button
                    onClick={fetchAdditionalSources}
                    disabled={fetchingSources}
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 border-purple-500/30 text-gray-400 hover:text-white"
                  >
                    Refresh Sources
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
