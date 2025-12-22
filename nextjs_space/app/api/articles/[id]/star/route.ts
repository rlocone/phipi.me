import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST - Toggle star status
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentArticle = await prisma.article.findUnique({
      where: { id: params.id },
    });

    if (!currentArticle) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const newStarredState = !currentArticle.isStarred;

    // If starring this article, unstar all others
    if (newStarredState) {
      await prisma.article.updateMany({
        where: { isStarred: true },
        data: { isStarred: false },
      });
    }

    const article = await prisma.article.update({
      where: { id: params.id },
      data: { isStarred: newStarredState },
    });

    return NextResponse.json({ article });
  } catch (error) {
    console.error('Error toggling star:', error);
    return NextResponse.json(
      { error: 'Failed to toggle star' },
      { status: 500 }
    );
  }
}
