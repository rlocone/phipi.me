import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Search articles
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl?.searchParams;
    const query = searchParams?.get('q');
    const category = searchParams?.get('category');
    const tag = searchParams?.get('tag');
    const limit = parseInt(searchParams?.get('limit') || '20');

    const where: any = {
      status: 'APPROVED', // Only search published articles
    };

    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { aiSummary: { contains: query, mode: 'insensitive' } },
        { aiFullPost: { contains: query, mode: 'insensitive' } },
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
      },
      orderBy: [
        { isStarred: 'desc' },
        { publishedAt: 'desc' },
      ],
      take: limit,
    });

    return NextResponse.json({ articles, count: articles.length });
  } catch (error) {
    console.error('Error searching articles:', error);
    return NextResponse.json(
      { error: 'Failed to search articles' },
      { status: 500 }
    );
  }
}
