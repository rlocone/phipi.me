import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - List all articles with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl?.searchParams;
    const status = searchParams?.get('status');
    const category = searchParams?.get('category');
    const tag = searchParams?.get('tag');
    const search = searchParams?.get('search');
    const starred = searchParams?.get('starred');

    const where: any = {};

    if (status) where.status = status;
    if (starred === 'true') where.isStarred = true;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { aiSummary: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) {
      where.categories = {
        some: {
          category: {
            slug: category,
          },
        },
      };
    }
    if (tag) {
      where.tags = {
        some: {
          tag: {
            slug: tag,
          },
        },
      };
    }

    const articles = await prisma.article.findMany({
      where,
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        sources: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: [
        { isStarred: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ articles });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

// POST - Create new article
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      title, 
      emoji,
      originalUrl, 
      rawContent, 
      aiSummary, 
      aiFullPost, 
      categoryIds, 
      tagIds,
      isVideo,
      videoId,
      thumbnailUrl,
      channelName,
      publishedAt,
      images,
      featuredImage,
      sources,
    } = body;

    if (!title || !originalUrl) {
      return NextResponse.json(
        { error: 'Title and URL are required' },
        { status: 400 }
      );
    }

    const article = await prisma.article.create({
      data: {
        title,
        emoji: emoji || null,
        originalUrl,
        rawContent,
        aiSummary,
        aiFullPost,
        status: 'DRAFT',
        isVideo: isVideo || false,
        videoId,
        thumbnailUrl,
        channelName,
        publishedAt: publishedAt ? new Date(publishedAt) : undefined,
        images: images || [],
        featuredImage: featuredImage || null,
        categories: categoryIds
          ? {
              create: categoryIds.map((id: string) => ({
                category: { connect: { id } },
              })),
            }
          : undefined,
        tags: tagIds
          ? {
              create: tagIds.map((id: string) => ({
                tag: { connect: { id } },
              })),
            }
          : undefined,
        sources: sources
          ? {
              create: sources.map((source: any, index: number) => ({
                title: source.title,
                url: source.url,
                description: source.description || null,
                approved: source.approved !== undefined ? source.approved : false,
                order: index,
              })),
            }
          : undefined,
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        sources: true,
      },
    });

    return NextResponse.json({ article }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating article:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Article with this URL already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    );
  }
}
