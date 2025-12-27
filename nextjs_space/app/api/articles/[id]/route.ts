import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Helper function to create slug from name
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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
        sources: {
          orderBy: {
            order: 'asc',
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
    const { 
      title,
      emoji, 
      rawContent, 
      aiSummary, 
      aiFullPost, 
      status, 
      isStarred, 
      publishedAt, 
      categoryIds, 
      tagNames,
      images,
      featuredImage,
      isVideo,
      videoId,
      thumbnailUrl,
      channelName
    } = body;

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
    if (emoji !== undefined) updateData.emoji = emoji;
    if (rawContent !== undefined) updateData.rawContent = rawContent;
    if (aiSummary !== undefined) updateData.aiSummary = aiSummary;
    if (aiFullPost !== undefined) updateData.aiFullPost = aiFullPost;
    if (status !== undefined) updateData.status = status;
    if (isStarred !== undefined) updateData.isStarred = isStarred;
    if (publishedAt !== undefined) updateData.publishedAt = publishedAt;
    if (images !== undefined) updateData.images = images;
    if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
    if (isVideo !== undefined) updateData.isVideo = isVideo;
    if (videoId !== undefined) updateData.videoId = videoId;
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
    if (channelName !== undefined) updateData.channelName = channelName;

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
        sources: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    // Update categories if provided
    if (categoryIds !== undefined) {
      await prisma.articleCategory.deleteMany({
        where: { articleId: params.id },
      });
      if (categoryIds.length > 0) {
        await prisma.articleCategory.createMany({
          data: categoryIds.map((id: string) => ({
            articleId: params.id,
            categoryId: id,
          })),
        });
      }
    }

    // Update tags if provided (handle tag names instead of IDs)
    if (tagNames !== undefined) {
      await prisma.articleTag.deleteMany({
        where: { articleId: params.id },
      });

      if (tagNames.length > 0) {
        // Get or create tags
        const tagRecords = await Promise.all(
          tagNames.map(async (name: string) => {
            const slug = createSlug(name);
            const tag = await prisma.tag.upsert({
              where: { name },
              update: {},
              create: { 
                name,
                slug
              },
            });
            return tag;
          })
        );

        // Create article-tag relationships
        await prisma.articleTag.createMany({
          data: tagRecords.map((tag) => ({
            articleId: params.id,
            tagId: tag.id,
          })),
        });
      }
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
