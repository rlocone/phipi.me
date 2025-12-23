import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import Parser from 'rss-parser';
import { parseRssContent } from '@/lib/content-parser';
import { fetchYouTubeMetadata } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

const parser = new Parser();

// POST - Fetch articles from RSS feed
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const feed = await prisma.rSSFeed.findUnique({
      where: { id: params.id },
    });

    if (!feed) {
      return NextResponse.json({ error: 'RSS feed not found' }, { status: 404 });
    }

    // Parse RSS feed
    const rssFeed = await parser.parseURL(feed.feedUrl);
    const articles = [];
    const errors = [];

    // Process each item
    for (const item of rssFeed.items) {
      if (!item.link) continue;

      try {
        // Check if article already exists
        const existing = await prisma.article.findUnique({
          where: { originalUrl: item.link },
        });

        if (existing) {
          continue; // Skip if already exists
        }

        // Parse RSS content to detect videos and clean HTML
        const rawContent = item.content || item.contentSnippet || '';
        const parsed = parseRssContent(rawContent);
        
        // Prepare article data
        const articleData: any = {
          title: item.title || 'Untitled',
          originalUrl: item.link,
          rawContent: parsed.cleanText || rawContent,
          status: 'DRAFT',
          isVideo: parsed.isVideo,
        };
        
        // If it's a YouTube video, fetch metadata
        if (parsed.isVideo && parsed.videoId) {
          try {
            const videoMetadata = await fetchYouTubeMetadata(`https://www.youtube.com/watch?v=${parsed.videoId}`);
            if (videoMetadata) {
              articleData.videoId = parsed.videoId;
              articleData.thumbnailUrl = videoMetadata.thumbnailUrl;
              articleData.channelName = videoMetadata.channelName;
              
              // Use video title if RSS title is generic
              if (videoMetadata.title && (!articleData.title || articleData.title === 'Untitled')) {
                articleData.title = videoMetadata.title;
              }
            }
          } catch (videoError) {
            console.error(`Error fetching YouTube metadata for ${parsed.videoId}:`, videoError);
            // Continue with basic video data
            articleData.videoId = parsed.videoId;
          }
        }

        // Create new article in DRAFT status
        const article = await prisma.article.create({
          data: articleData,
        });

        articles.push(article);
      } catch (error: any) {
        console.error(`Error processing item ${item.link}:`, error);
        errors.push({ url: item.link, error: error?.message });
      }
    }

    // Update last fetched time
    await prisma.rSSFeed.update({
      where: { id: params.id },
      data: { lastFetchedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      articlesCreated: articles.length,
      articles,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error fetching RSS feed:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch RSS feed' },
      { status: 500 }
    );
  }
}
