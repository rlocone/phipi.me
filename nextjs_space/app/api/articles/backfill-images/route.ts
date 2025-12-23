import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { extractImagesFromHTML, extractMetaImages, getBestImages, getValidImages } from '@/lib/image-extractor';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for processing multiple articles

// POST - Backfill images for articles without images
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all articles without images (and not videos)
    const articles = await prisma.article.findMany({
      where: {
        isVideo: false,
        OR: [
          { images: { isEmpty: true } },
          { images: { equals: [] } },
        ],
      },
      select: {
        id: true,
        title: true,
        originalUrl: true,
      },
    });

    if (articles.length === 0) {
      return NextResponse.json({
        message: 'No articles found without images',
        processed: 0,
        total: 0,
      });
    }

    const results = {
      total: articles.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each article
    for (const article of articles) {
      try {
        // Fetch the article page
        const response = await fetch(article.originalUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PHIPIContentHub/1.0)',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout per article
        });

        if (!response.ok) {
          results.failed++;
          results.errors.push(`${article.title}: Failed to fetch URL (${response.status})`);
          continue;
        }

        const html = await response.text();

        // Extract images
        const contentImages = extractImagesFromHTML(html, article.originalUrl);
        const metaImages = extractMetaImages(html);
        const bestImages = getBestImages(contentImages, metaImages, 5);

        // Validate images
        const validImages = await getValidImages(bestImages);

        if (validImages.length > 0) {
          // Update article with images
          await prisma.article.update({
            where: { id: article.id },
            data: {
              images: validImages,
              featuredImage: validImages[0],
            },
          });

          results.succeeded++;
        } else {
          results.failed++;
          results.errors.push(`${article.title}: No valid images found`);
        }

        results.processed++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${article.title}: ${error?.message || 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      message: `Backfill complete: ${results.succeeded} succeeded, ${results.failed} failed`,
      ...results,
    });
  } catch (error: any) {
    console.error('Error backfilling images:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to backfill images' },
      { status: 500 }
    );
  }
}

// GET - Check how many articles need image backfill
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await prisma.article.count({
      where: {
        isVideo: false,
        OR: [
          { images: { isEmpty: true } },
          { images: { equals: [] } },
        ],
      },
    });

    return NextResponse.json({
      articlesWithoutImages: count,
      message: count > 0 
        ? `${count} article(s) need image backfill`
        : 'All articles have images',
    });
  } catch (error: any) {
    console.error('Error checking articles:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to check articles' },
      { status: 500 }
    );
  }
}
