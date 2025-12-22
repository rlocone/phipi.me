import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

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

    // Fetch the webpage
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
    });
  } catch (error: any) {
    console.error('Error processing URL:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process URL' },
      { status: 500 }
    );
  }
}
