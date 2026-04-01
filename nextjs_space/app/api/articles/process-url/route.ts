import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { isYouTubeUrl, fetchYouTubeMetadata, cleanYouTubeUrl } from '@/lib/youtube';
import { extractImagesFromHTML, extractMetaImages, getBestImages, getValidImages } from '@/lib/image-extractor';
import { sanitizeUrl, isNotionUrl } from '@/lib/url-sanitizer';
import { fetchNotionPage } from '@/lib/notion';
import { isRecallUrl, fetchRecallPage } from '@/lib/recall';

export const dynamic = 'force-dynamic';

// POST - Extract content from URL
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    let { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Sanitize URL to remove tracking parameters
    url = sanitizeUrl(url);

    // Check if it's a YouTube URL
    if (isYouTubeUrl(url)) {
      const metadata = await fetchYouTubeMetadata(url);
      
      if (!metadata) {
        return NextResponse.json(
          { error: 'Failed to fetch YouTube video metadata' },
          { status: 422 }
        );
      }

      const cleanUrl = cleanYouTubeUrl(url);

      return NextResponse.json({
        title: metadata.title,
        content: metadata.description,
        excerpt: metadata.description.slice(0, 200) + (metadata.description.length > 200 ? '...' : ''),
        isVideo: true,
        videoId: metadata.videoId,
        thumbnailUrl: metadata.thumbnailUrl,
        channelName: metadata.channelName,
        publishedAt: metadata.publishDate,
        originalUrl: cleanUrl || url,
      });
    }

    // Check if it's a Notion URL
    if (isNotionUrl(url)) {
      const notionData = await fetchNotionPage(url);
      
      if (!notionData) {
        return NextResponse.json(
          { error: 'Failed to fetch Notion page content' },
          { status: 422 }
        );
      }

      return NextResponse.json({
        title: notionData.title,
        content: notionData.content,
        excerpt: notionData.excerpt,
        isVideo: false,
        images: notionData.images,
        featuredImage: notionData.featuredImage,
        originalUrl: notionData.originalUrl,
      });
    }

    // Check if it's a Recall AI URL
    if (isRecallUrl(url)) {
      const recallData = await fetchRecallPage(url);
      
      if (!recallData) {
        return NextResponse.json(
          { error: 'Failed to fetch Recall page content' },
          { status: 422 }
        );
      }

      return NextResponse.json({
        title: recallData.title,
        content: recallData.content,
        excerpt: recallData.excerpt,
        isVideo: false,
        images: recallData.images,
        featuredImage: recallData.featuredImage,
        originalUrl: recallData.originalUrl,
      });
    }

    // Regular article processing
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.statusText}` },
        { status: response.status }
      );
    }

    const html = await response.text();

    // Extract images before parsing
    const contentImages = extractImagesFromHTML(html, url);
    const metaImages = extractMetaImages(html);
    const bestImages = getBestImages(contentImages, metaImages, 5);
    
    // Validate images (check if they're accessible)
    const validImages = await getValidImages(bestImages);

    // Parse with Readability
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;
    const reader = new Readability(document.cloneNode(true) as any);
    const article = reader.parse();

    // Extract meta content as fallback for JS-rendered pages
    const metaTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')
      || document.querySelector('title')?.textContent
      || '';
    const metaDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content')
      || document.querySelector('meta[name="description"]')?.getAttribute('content')
      || '';
    
    // Try to extract content from JSON-LD structured data
    let jsonLdContent = '';
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    const ldJsonStr = document.querySelector('meta[name="application-ld+json"]')?.getAttribute('content') || '';
    const jsonLdSources = [...Array.from(jsonLdScripts).map(s => s.textContent || ''), ldJsonStr].filter(Boolean);
    for (const src of jsonLdSources) {
      try {
        const ld = JSON.parse(src);
        if (ld.articleBody) jsonLdContent = ld.articleBody;
        if (ld.description && !jsonLdContent) jsonLdContent = ld.description;
      } catch { /* skip invalid JSON-LD */ }
    }

    // Determine best content: prefer Readability, fall back to meta/JSON-LD
    let finalTitle = article?.title || metaTitle || 'Untitled';
    let finalContent = article?.textContent || '';
    let finalExcerpt = article?.excerpt || metaDescription || '';

    // If Readability extracted too little meaningful content (< 100 chars of real text),
    // supplement with meta descriptions and JSON-LD
    const cleanContent = finalContent.replace(/\s+/g, ' ').trim();
    if (cleanContent.length < 100) {
      const supplementContent = [metaDescription, jsonLdContent].filter(Boolean).join('\n\n');
      if (supplementContent.length > cleanContent.length) {
        finalContent = supplementContent;
      }
    }

    if (!finalContent && !finalExcerpt) {
      return NextResponse.json(
        { error: 'Failed to parse article content. The site may require JavaScript rendering.' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      title: finalTitle,
      content: finalContent,
      excerpt: finalExcerpt,
      isVideo: false,
      images: validImages,
      featuredImage: validImages.length > 0 ? validImages[0] : null,
      originalUrl: url,
    });
  } catch (error: any) {
    console.error('Error processing URL:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process URL' },
      { status: 500 }
    );
  }
}
