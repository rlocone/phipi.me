import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { sanitizeUrl } from './url-sanitizer';
import { extractImagesFromHTML, extractMetaImages, getBestImages, getValidImages } from './image-extractor';

/**
 * Check if a URL is a Recall AI share URL
 */
export function isRecallUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'app.getrecall.ai' &&
      parsed.pathname.startsWith('/share/')
    );
  } catch {
    return false;
  }
}

/**
 * Extract the share ID from a Recall AI URL
 */
export function getRecallShareId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!isRecallUrl(url)) return null;
    
    // URL format: https://app.getrecall.ai/share/{uuid}
    const pathParts = parsed.pathname.split('/');
    const shareIndex = pathParts.indexOf('share');
    if (shareIndex !== -1 && pathParts[shareIndex + 1]) {
      return pathParts[shareIndex + 1];
    }
    return null;
  } catch {
    return null;
  }
}

interface RecallPageResult {
  title: string;
  content: string;
  excerpt: string;
  images: string[];
  featuredImage: string | null;
  originalUrl: string;
}

/**
 * Fetch and parse content from a Recall AI share page
 */
export async function fetchRecallPage(url: string): Promise<RecallPageResult | null> {
  try {
    const cleanUrl = sanitizeUrl(url);
    
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PHIPIContentHub/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch Recall page: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Extract images
    const contentImages = extractImagesFromHTML(html, cleanUrl);
    const metaImages = extractMetaImages(html);
    const bestImages = getBestImages(contentImages, metaImages, 6);
    const validImages = await getValidImages(bestImages);

    // Parse with JSDOM and Readability
    const dom = new JSDOM(html, { url: cleanUrl });
    const document = dom.window.document;

    // Try to extract title from various sources
    let title = '';
    
    // Check meta tags first
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content');
    const metaTitle = document.querySelector('title')?.textContent;
    
    // Look for main heading in content
    const h1 = document.querySelector('h1')?.textContent;
    const mainTitle = document.querySelector('[class*="title"], [class*="heading"]')?.textContent;
    
    title = (ogTitle || twitterTitle || h1 || mainTitle || metaTitle || 'Untitled').trim();
    
    // Clean up title (remove site suffix if present)
    title = title.replace(/\s*[-|]\s*Recall.*$/i, '').trim();

    // Use Readability to parse the content
    const reader = new Readability(document);
    const article = reader.parse();

    let content = '';
    let excerpt = '';

    if (article) {
      content = article.textContent || '';
      excerpt = article.excerpt || content.slice(0, 200) + (content.length > 200 ? '...' : '');
      
      // Use article title if better than what we found
      if (article.title && article.title.length > title.length) {
        title = article.title.replace(/\s*[-|]\s*Recall.*$/i, '').trim();
      }
    } else {
      // Fallback: extract text from body
      const bodyText = document.body?.textContent || '';
      content = bodyText.replace(/\s+/g, ' ').trim();
      excerpt = content.slice(0, 200) + (content.length > 200 ? '...' : '');
    }

    // Additional cleanup for Recall-specific content
    // Remove common UI text that might be captured
    content = content
      .replace(/Sign in|Log in|Share|Copy link|Recall/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      title,
      content,
      excerpt,
      images: validImages,
      featuredImage: validImages.length > 0 ? validImages[0] : null,
      originalUrl: cleanUrl,
    };
  } catch (error) {
    console.error('Error fetching Recall page:', error);
    return null;
  }
}
