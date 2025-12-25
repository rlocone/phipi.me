/**
 * Notion Page Parser
 * Handles fetching and parsing content from Notion pages
 */

import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { sanitizeUrl, getNotionPageId } from './url-sanitizer';
import { extractImagesFromHTML, extractMetaImages, getBestImages, getValidImages } from './image-extractor';

export interface NotionPageData {
  title: string;
  content: string;
  excerpt: string;
  images: string[];
  featuredImage: string | null;
  pageId: string | null;
  originalUrl: string;
}

/**
 * Fetches and parses a Notion page
 * @param url - Notion page URL
 * @returns Parsed page data
 */
export async function fetchNotionPage(url: string): Promise<NotionPageData | null> {
  try {
    // Sanitize URL first
    const cleanUrl = sanitizeUrl(url);
    const pageId = getNotionPageId(cleanUrl);

    // Fetch the Notion page
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PHIPIContentHub/1.0; +https://phipi.me)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Notion page: ${response.statusText}`);
    }

    const html = await response.text();

    // Extract images before parsing
    const contentImages = extractImagesFromHTML(html, cleanUrl);
    const metaImages = extractMetaImages(html);
    const bestImages = getBestImages(contentImages, metaImages, 5);
    
    // Validate images (check if they're accessible)
    const validImages = await getValidImages(bestImages);

    // Parse with Readability
    const dom = new JSDOM(html, { url: cleanUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      // Fallback: Try to extract content directly from Notion's structure
      const fallbackContent = extractNotionContentFallback(dom.window.document);
      if (fallbackContent) {
        return {
          title: fallbackContent.title || 'Untitled Notion Page',
          content: fallbackContent.content || '',
          excerpt: fallbackContent.content.slice(0, 200) + (fallbackContent.content.length > 200 ? '...' : ''),
          images: validImages,
          featuredImage: validImages.length > 0 ? validImages[0] : null,
          pageId,
          originalUrl: cleanUrl,
        };
      }
      throw new Error('Failed to parse Notion page content');
    }

    return {
      title: article.title || 'Untitled Notion Page',
      content: article.textContent || '',
      excerpt: article.excerpt || (article.textContent?.slice(0, 200) + (article.textContent && article.textContent.length > 200 ? '...' : '')) || '',
      images: validImages,
      featuredImage: validImages.length > 0 ? validImages[0] : null,
      pageId,
      originalUrl: cleanUrl,
    };
  } catch (error: any) {
    console.error('Error fetching Notion page:', error);
    return null;
  }
}

/**
 * Fallback content extraction for Notion pages
 * Used when Readability fails to parse the page
 */
function extractNotionContentFallback(document: Document): { title: string; content: string } | null {
  try {
    // Try to find the page title
    let title = '';
    const titleElement = document.querySelector('h1') || document.querySelector('title');
    if (titleElement) {
      title = titleElement.textContent?.trim() || '';
    }

    // Try to extract main content
    let content = '';
    
    // Notion pages typically have content in specific containers
    const contentSelectors = [
      '.notion-page-content',
      '[data-block-id]',
      'main',
      'article',
      '.notion-frame',
    ];

    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        content = element.textContent?.trim() || '';
        if (content.length > 100) {
          break;
        }
      }
    }

    // If still no content, try body
    if (!content || content.length < 50) {
      const body = document.querySelector('body');
      if (body) {
        content = body.textContent?.trim() || '';
      }
    }

    // Clean up content
    content = content.replace(/\s+/g, ' ').trim();

    if (!title && !content) {
      return null;
    }

    return { title, content };
  } catch (error) {
    console.error('Error in fallback content extraction:', error);
    return null;
  }
}
