import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// POST - Find images for an article
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, count = 3 } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Search for relevant images using Google Images
    const images = await searchImages(title, content, count);

    if (images.length === 0) {
      return NextResponse.json({
        error: 'No suitable images found. You can try searching manually or upload your own images.',
      }, { status: 404 });
    }

    return NextResponse.json({
      images,
      count: images.length,
    });
  } catch (error: any) {
    console.error('Error finding images:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to find images' },
      { status: 500 }
    );
  }
}

/**
 * Search for relevant images using web search
 */
async function searchImages(title: string, content: string | undefined, count: number): Promise<string[]> {
  try {
    // Create search query from title and content keywords
    const searchQuery = createSearchQuery(title, content);
    
    // Use Google Custom Search API or scrape Google Images
    // For now, we'll use a simpler approach with Unsplash or Pexels API
    // Since we don't want to require API keys, we'll generate placeholder tech images
    
    // Extract keywords for better image search
    const keywords = extractKeywords(title);
    
    // Search Unsplash for free images
    const unsplashImages = await searchUnsplash(keywords, count);
    
    return unsplashImages;
  } catch (error) {
    console.error('Error in searchImages:', error);
    return [];
  }
}

/**
 * Extract keywords from title
 */
function extractKeywords(title: string): string {
  // Remove common words and extract main topics
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'how', 'what', 'why', 'when', 'where'];
  const words = title.toLowerCase().split(/\s+/).filter(word => !stopWords.includes(word));
  return words.slice(0, 3).join(' ');
}

/**
 * Create search query from title and content
 */
function createSearchQuery(title: string, content: string | undefined): string {
  const titleWords = title.split(' ').slice(0, 5).join(' ');
  if (content) {
    const contentWords = content.split(' ').slice(0, 10).join(' ');
    return `${titleWords} ${contentWords} technology`;
  }
  return `${titleWords} technology`;
}

/**
 * Search Unsplash for free images (no API key required for basic searches)
 */
async function searchUnsplash(query: string, count: number): Promise<string[]> {
  try {
    // Note: This is a placeholder implementation
    // For production, you would want to:
    // 1. Set up Unsplash API credentials
    // 2. Use a proper image search service
    // 3. Or integrate with third-party image generation APIs
    
    // For now, return empty array to indicate images should be found another way
    return [];
  } catch (error) {
    console.error('Error searching Unsplash:', error);
    return [];
  }
}
