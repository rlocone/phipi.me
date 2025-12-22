import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Get single article
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const article = await prisma.article.findUnique({
      where: { id: params.id },
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
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ article });
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}

// PATCH - Update article
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, rawContent, aiSummary, aiFullPost, status, isStarred, publishedAt, categoryIds, tagIds } = body;

    // If starring this article, unstar all others
    if (isStarred === true) {
      await prisma.article.updateMany({
        where: { isStarred: true },
        data: { isStarred: false },
      });
    }

    // Update article
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (rawContent !== undefined) updateData.rawContent = rawContent;
    if (aiSummary !== undefined) updateData.aiSummary = aiSummary;
    if (aiFullPost !== undefined) updateData.aiFullPost = aiFullPost;
    if (status !== undefined) updateData.status = status;
    if (isStarred !== undefined) updateData.isStarred = isStarred;
    if (publishedAt !== undefined) updateData.publishedAt = publishedAt;

    const article = await prisma.article.update({
      where: { id: params.id },
      data: updateData,
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
    });

    // Update categories if provided
    if (categoryIds !== undefined) {
      await prisma.articleCategory.deleteMany({
        where: { articleId: params.id },
      });
      await prisma.articleCategory.createMany({
        data: categoryIds.map((id: string) => ({
          articleId: params.id,
          categoryId: id,
        })),
      });
    }

    // Update tags if provided
    if (tagIds !== undefined) {
      await prisma.articleTag.deleteMany({
        where: { articleId: params.id },
      });
      await prisma.articleTag.createMany({
        data: tagIds.map((id: string) => ({
          articleId: params.id,
          tagId: id,
        })),
      });
    }

    return NextResponse.json({ article });
  } catch (error) {
    console.error('Error updating article:', error);
    return NextResponse.json(
      { error: 'Failed to update article' },
      { status: 500 }
    );
  }
}

// DELETE - Delete article
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.article.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting article:', error);
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    );
  }
}
