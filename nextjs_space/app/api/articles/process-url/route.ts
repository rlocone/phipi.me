import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import puppeteer from 'puppeteer-core';
import { isYouTubeUrl, fetchYouTubeMetadata, cleanYouTubeUrl } from '@/lib/youtube';
import { extractImagesFromHTML, extractMetaImages, getBestImages, getValidImages } from '@/lib/image-extractor';
import { sanitizeUrl, isNotionUrl } from '@/lib/url-sanitizer';
import { fetchNotionPage } from '@/lib/notion';
import { isRecallUrl, fetchRecallPage } from '@/lib/recall';

interface ArticleExtractionResult {
  title: string;
  content: string;
  excerpt: string;
  images: string[];
  featuredImage: string | null;
  originalUrl: string;
}

function getChromePath(): string {
  const paths = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    process.env.CHROME_PATH || '',
  ];

  for (const p of paths) {
    if (!p) continue;
    try {
      const fs = require('fs');
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore path probe errors
    }
  }

  return '/usr/bin/google-chrome';
}

function sanitizeHtmlForReadability(html: string): string {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi, '')
    .replace(/\sstyle=("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

async function extractWithBrowser(url: string): Promise<ArticleExtractionResult | null> {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      executablePath: getChromePath(),
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const browserData = await page.evaluate(() => {
      const clean = (text: string) => text.replace(/\s+/g, ' ').trim();

      const meta = (selector: string) => document.querySelector(selector)?.getAttribute('content') || '';
      const titleFromDom = clean(
        document.querySelector('h1')?.textContent ||
        document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
        document.title ||
        'Untitled'
      );

      const description = clean(
        meta('meta[property="og:description"]') ||
        meta('meta[name="description"]') || ''
      );

      const root = (document.querySelector('article') || document.querySelector('main') || document.body) as HTMLElement;
      const textNodes = Array.from(root.querySelectorAll('p, li, h1, h2, h3, h4, blockquote'));
      let content = '';
      for (const node of textNodes) {
        const text = clean((node as HTMLElement).innerText || node.textContent || '');
        if (text && text.length > 20) content += text + '\n\n';
      }
      if (!content.trim()) {
        content = clean((root as HTMLElement).innerText || root.textContent || '');
      }

      const images: string[] = [];
      const imgElements = Array.from(document.querySelectorAll('img[src]'));
      for (const img of imgElements) {
        const src = img.getAttribute('src') || '';
        if (!src || src.startsWith('data:')) continue;
        if (src.includes('logo') || src.includes('icon') || src.includes('avatar')) continue;
        try {
          images.push(new URL(src, location.href).href);
        } catch {
          continue;
        }
      }

      return {
        title: titleFromDom,
        content: content.slice(0, 10000),
        excerpt: description ? description.slice(0, 200) : '',
        images: Array.from(new Set(images)).slice(0, 5),
        metaTitle: meta('meta[property="og:title"]') || document.title || '',
        metaDescription: description,
      };
    });

    await browser.close();
    browser = null;

    const validImages = await getValidImages(browserData.images);

    const finalContent = browserData.content || browserData.metaDescription || '';
    const finalExcerpt = browserData.excerpt || browserData.metaDescription || '';

    return {
      title: browserData.title || browserData.metaTitle || 'Untitled',
      content: finalContent,
      excerpt: finalExcerpt,
      images: validImages,
      featuredImage: validImages.length > 0 ? validImages[0] : null,
      originalUrl: url,
    };
  } catch (error) {
    console.error('Browser fallback extraction failed:', error);
    if (browser) {
      await browser.close().catch(() => {});
    }
    return null;
  }
}

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
    const sanitizedHtml = sanitizeHtmlForReadability(html);

    try {
      // Extract images before parsing
      const contentImages = extractImagesFromHTML(html, url);
      const metaImages = extractMetaImages(html);
      const bestImages = getBestImages(contentImages, metaImages, 5);
      
      // Validate images (check if they're accessible)
      const validImages = await getValidImages(bestImages);

      // Parse with Readability
      const dom = new JSDOM(sanitizedHtml, { url });
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

      // If Readability extracted too little meaningful content, supplement or fall back.
      const cleanContent = finalContent.replace(/\s+/g, ' ').trim();
      const supplementContent = [metaDescription, jsonLdContent].filter(Boolean).join('\n\n');
      if (cleanContent.length < 100 && supplementContent.length > cleanContent.length) {
        finalContent = supplementContent;
      }

      const finalCleanContent = finalContent.replace(/\s+/g, ' ').trim();
      const shouldTryBrowserFallback = finalCleanContent.length < 300;
      if (shouldTryBrowserFallback) {
        const browserFallback = await extractWithBrowser(url);
        if (browserFallback) {
          return NextResponse.json(browserFallback);
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
    } catch (parseError) {
      console.error('Readability/jsdom parsing failed, trying browser fallback:', parseError);
      const browserFallback = await extractWithBrowser(url);
      if (browserFallback) {
        return NextResponse.json(browserFallback);
      }

      return NextResponse.json(
        { error: 'Failed to parse article content. The site may require JavaScript rendering.' },
        { status: 422 }
      );
    }
  } catch (error: any) {
    console.error('Error processing URL:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process URL' },
      { status: 500 }
    );
  }
}
