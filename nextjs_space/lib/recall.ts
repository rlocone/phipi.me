import puppeteer from 'puppeteer-core';
import { sanitizeUrl } from './url-sanitizer';

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
 * Find Chrome executable path
 */
function getChromePath(): string {
  const paths = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    process.env.CHROME_PATH || '',
  ];
  
  for (const p of paths) {
    if (p) {
      try {
        const fs = require('fs');
        if (fs.existsSync(p)) {
          return p;
        }
      } catch {}
    }
  }
  
  return '/usr/bin/google-chrome';
}

/**
 * Fetch and parse content from a Recall AI share page using headless browser
 */
export async function fetchRecallPage(url: string): Promise<RecallPageResult | null> {
  let browser = null;
  
  try {
    const cleanUrl = sanitizeUrl(url);
    
    // Launch headless browser
    browser = await puppeteer.launch({
      executablePath: getChromePath(),
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate and wait for content to load
    await page.goto(cleanUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for content to render (Recall's summary area)
    await page.waitForSelector('h1, [class*="summary"], [class*="notebook"]', { timeout: 15000 }).catch(() => {});
    
    // Additional wait for dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract content from the rendered page
    const pageData = await page.evaluate(() => {
      // Get title from header area - Recall shows the source title in a header element
      let headerTitle = '';
      
      // Try various selectors for title
      const h1 = document.querySelector('h1') as HTMLElement | null;
      const titleElement = document.querySelector('[class*="title"]:not([class*="subtitle"])') as HTMLElement | null;
      const sourceTitle = document.querySelector('[class*="source"] + div, [class*="header"] h1, [class*="card-header"]') as HTMLElement | null;
      
      // Get all potential title texts
      const candidates = [
        h1?.innerText?.trim(),
        titleElement?.innerText?.trim(),
        sourceTitle?.innerText?.trim(),
      ].filter((t): t is string => !!t && t.length > 5 && t.length < 200);
      
      // Pick the best title (longest meaningful one)
      headerTitle = candidates.sort((a, b) => (b?.length || 0) - (a?.length || 0))[0] || '';
      
      // Get all content from the summary/notebook area
      const contentArea = document.body;
      const paragraphs = contentArea.querySelectorAll('p, li, h2, h3, h4');
      let content = '';
      
      paragraphs.forEach(p => {
        const text = (p as HTMLElement).innerText?.trim();
        if (text && text.length > 15 && !text.includes('Chat with') && !text.includes('Sign in')) {
          content += text + '\n\n';
        }
      });
      
      // Get images from the page
      const images: string[] = [];
      const imgElements = document.querySelectorAll('img[src]');
      imgElements.forEach(img => {
        const src = img.getAttribute('src');
        if (src && src.startsWith('http') && !src.includes('icon') && !src.includes('logo')) {
          images.push(src);
        }
      });
      
      // Try to get featured image from og:image or thumbnail
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
      const thumbnail = document.querySelector('[class*="thumbnail"] img, [class*="cover"] img')?.getAttribute('src');
      
      return {
        title: headerTitle,
        content: content.slice(0, 10000),
        images,
        featuredImage: ogImage || thumbnail || (images.length > 0 ? images[0] : null),
      };
    });

    await browser.close();
    browser = null;

    if (!pageData.content || pageData.content.length < 100) {
      console.error('Failed to extract content from Recall page');
      return null;
    }

    // Clean up content
    let content = pageData.content
      .replace(/\ufeff/g, '')
      .replace(/\d{2}:\d{2}\./g, '') // Remove timestamps like "00:21."
      .replace(/\s+/g, ' ')
      .trim();

    const excerpt = content.slice(0, 200) + (content.length > 200 ? '...' : '');

    return {
      title: pageData.title || 'Recall Summary',
      content,
      excerpt,
      images: pageData.images.slice(0, 6),
      featuredImage: pageData.featuredImage,
      originalUrl: cleanUrl,
    };
  } catch (error) {
    console.error('Error fetching Recall page:', error);
    if (browser) {
      await browser.close().catch(() => {});
    }
    return null;
  }
}
