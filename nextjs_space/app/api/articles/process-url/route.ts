import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { isYouTubeUrl, fetchYouTubeMetadata, cleanYouTubeUrl } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

// POST - Extract content from URL
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

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

    // Regular article processing
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PHPIContentHub/1.0)'
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.statusText}` },
        { status: response.status }
      );
    }

    const html = await response.text();

    // Parse with Readability
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return NextResponse.json(
        { error: 'Failed to parse article content' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      title: article.title || 'Untitled',
      content: article.textContent || '',
      excerpt: article.excerpt || '',
      isVideo: false,
    });
  } catch (error: any) {
    console.error('Error processing URL:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process URL' },
      { status: 500 }
    );
  }
}
