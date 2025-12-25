/**
 * Notion Page Parser
 * Handles fetching and parsing content from Notion pages
 * 
 * Note: Notion pages are JavaScript-rendered SPAs. This parser extracts
 * metadata and provides instructions for manual content entry.
 */

import { JSDOM } from 'jsdom';
import { sanitizeUrl, getNotionPageId } from './url-sanitizer';
import { extractMetaImages, getValidImages } from './image-extractor';

export interface NotionPageData {
  title: string;
  content: string;
  excerpt: string;
  images: string[];
  featuredImage: string | null;
  pageId: string | null;
  originalUrl: string;
  requiresManualEntry?: boolean;
}

/**
 * Extracts title from Notion page URL
 */
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Format: /{title}-{pageId}
    const parts = pathname.split('/').filter(p => p);
    if (parts.length > 0) {
      const lastPart = parts[parts.length - 1];
      const titlePart = lastPart.split('-').slice(0, -1).join('-');
      if (titlePart) {
        // Convert hyphenated title to readable format
        return titlePart
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }
    return 'Notion Page';
  } catch {
    return 'Notion Page';
  }
}

/**
 * Fetches and parses a Notion page
 * @param url - Notion page URL
 * @returns Parsed page data with instructions for manual entry
 */
export async function fetchNotionPage(url: string): Promise<NotionPageData | null> {
  try {
    // Sanitize URL first
    const cleanUrl = sanitizeUrl(url);
    const pageId = getNotionPageId(cleanUrl);

    // Extract title from URL
    const title = extractTitleFromUrl(cleanUrl);

    // Fetch the Notion page to get metadata
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
    const dom = new JSDOM(html, { url: cleanUrl });

    // Extract meta images (OG images, Twitter cards)
    const metaImages = extractMetaImages(html);
    const validImages = await getValidImages(metaImages);

    // Extract description from meta tags
    let description = '';
    const descMeta = dom.window.document.querySelector('meta[name="description"]');
    const ogDescMeta = dom.window.document.querySelector('meta[property="og:description"]');
    if (descMeta) {
      description = descMeta.getAttribute('content') || '';
    } else if (ogDescMeta) {
      description = ogDescMeta.getAttribute('content') || '';
    }

    // Since Notion pages are JS-rendered, provide a helpful message
    const content = description || `This is a Notion page. Please copy and paste the content from the Notion page:\n\n${cleanUrl}\n\nYou can view the page in your browser and manually enter the content below, or use the AI generation tools to create content based on the title.`;

    return {
      title,
      content,
      excerpt: description || 'Notion page - manual content entry required',
      images: validImages,
      featuredImage: validImages.length > 0 ? validImages[0] : null,
      pageId,
      originalUrl: cleanUrl,
      requiresManualEntry: true,
    };
  } catch (error: any) {
    console.error('Error fetching Notion page:', error);
    return null;
  }
}


