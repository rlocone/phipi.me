import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/require-admin';
import prisma from '@/lib/db';
import { openRouterChatCompletions } from '@/lib/openrouter';
import { SITE_CATEGORIES, type SiteCategory } from '@/lib/morning-queue';
import { extractYouTubeVideoId } from '@/lib/youtube';
import { DEFAULT_ARTICLE_AUTHOR } from '@/lib/article-author';
import { clipForPurpose } from '@/lib/llm-usage';
import { assertPublicHttpUrl } from '@/lib/safe-url';

export const dynamic = 'force-dynamic';

const PLACEHOLDER_SUMMARY =
  'Draft saved from the morning queue. Summary pending — OpenRouter was unavailable.';

async function generateSummary(title: string, excerpt: string): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) return PLACEHOLDER_SUMMARY;
  try {
    const response = await openRouterChatCompletions({
      messages: [
        {
          role: 'system',
          content:
            'You are an expert content summarizer for a cybersecurity and privacy-focused tech blog. Create concise, engaging summaries that capture the key points.',
        },
        {
          role: 'user',
          content: `Please create a compelling 2-3 sentence summary of the following article titled "${title}":\n\n${clipForPurpose(excerpt || title, 'keep-summary')}\n\nProvide only the summary, no additional commentary.`,
        },
      ],
      stream: false,
      max_tokens: 160,
      purpose: 'keep-summary',
    });
    if (!response.ok) return PLACEHOLDER_SUMMARY;
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text || PLACEHOLDER_SUMMARY;
  } catch (error) {
    console.warn('Morning keep summary fallback', error);
    return PLACEHOLDER_SUMMARY;
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const title = String(body?.title || '').trim();
    const originalUrl = String(body?.url || body?.originalUrl || '').trim();
    const featuredImage = body?.featuredImage ? String(body.featuredImage) : null;
    const images = Array.isArray(body?.images)
      ? body.images.map((u: unknown) => String(u)).filter(Boolean)
      : featuredImage
        ? [featuredImage]
        : [];
    const excerpt = String(body?.excerpt || '');
    const categoryName = String(body?.category || '') as SiteCategory;
    const extraReading = body?.extraReading && body.extraReading.title && body.extraReading.url
      ? { title: String(body.extraReading.title), url: String(body.extraReading.url) }
      : null;

    const publicUrl = assertPublicHttpUrl(originalUrl);
    if (!title || !publicUrl) {
      return NextResponse.json({ error: 'Title and a public http(s) URL are required' }, { status: 400 });
    }

    if (!SITE_CATEGORIES.includes(categoryName)) {
      return NextResponse.json({ error: 'Category must be one of the site categories' }, { status: 400 });
    }

    const category = await prisma.category.findFirst({
      where: { name: { equals: categoryName, mode: 'insensitive' } },
    });

    const youtubeId = extractYouTubeVideoId(originalUrl);
    const summary = await generateSummary(title, excerpt);

    const existing = await prisma.article.findUnique({
      where: { originalUrl: publicUrl },
      include: {
        categories: { include: { category: true } },
        sources: true,
      },
    });
    if (existing) {
      return NextResponse.json({ article: existing, alreadyExisted: true });
    }

    const article = await prisma.article.create({
      data: {
        title,
        author: DEFAULT_ARTICLE_AUTHOR,
        originalUrl: publicUrl,
        rawContent: excerpt || null,
        aiSummary: summary,
        status: 'DRAFT',
        isVideo: Boolean(youtubeId),
        videoId: youtubeId,
        thumbnailUrl: featuredImage,
        images,
        featuredImage,
        categories: category
          ? { create: [{ category: { connect: { id: category.id } } }] }
          : undefined,
        sources: extraReading
          ? {
              create: [
                {
                  title: extraReading.title,
                  url: extraReading.url,
                  description: 'Auto-picked extra reading from the morning queue',
                  approved: true,
                  order: 0,
                },
              ],
            }
          : undefined,
      },
      include: {
        categories: { include: { category: true } },
        sources: true,
      },
    });

    return NextResponse.json({ article }, { status: 201 });
  } catch (error: any) {
    console.error('Morning queue keep failed', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Article with this URL already exists' }, { status: 409 });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to keep item' },
      { status: 500 }
    );
  }
}
