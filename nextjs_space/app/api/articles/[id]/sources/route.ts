import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

interface SourceInput {
  id?: string;
  title: string;
  url: string;
  description?: string;
  approved?: boolean;
  order?: number;
}

// GET - Get all sources for an article
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sources = await prisma.additionalSource.findMany({
      where: { articleId: params.id },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}

// POST - Add a new source or bulk update sources
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { source, sources: bulkSources } = body;

    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id: params.id },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Bulk update/replace all sources
    if (bulkSources && Array.isArray(bulkSources)) {
      // Delete existing sources
      await prisma.additionalSource.deleteMany({
        where: { articleId: params.id },
      });

      // Create new sources
      if (bulkSources.length > 0) {
        await prisma.additionalSource.createMany({
          data: bulkSources.map((s: SourceInput, index: number) => ({
            articleId: params.id,
            title: s.title,
            url: s.url,
            description: s.description || null,
            approved: s.approved ?? false,
            order: s.order ?? index,
          })),
          skipDuplicates: true,
        });
      }

      const updatedSources = await prisma.additionalSource.findMany({
        where: { articleId: params.id },
        orderBy: { order: 'asc' },
      });

      return NextResponse.json({ sources: updatedSources });
    }

    // Add single source
    if (source) {
      const maxOrder = await prisma.additionalSource.aggregate({
        where: { articleId: params.id },
        _max: { order: true },
      });

      const newSource = await prisma.additionalSource.create({
        data: {
          articleId: params.id,
          title: source.title,
          url: source.url,
          description: source.description || null,
          approved: source.approved ?? false,
          order: (maxOrder._max.order ?? -1) + 1,
        },
      });

      return NextResponse.json({ source: newSource });
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error adding source:', error);
    // Handle unique constraint violation
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'A source with this URL already exists for this article' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to add source' },
      { status: 500 }
    );
  }
}

// PATCH - Update a single source
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
    const { sourceId, title, url, description, approved, order } = body;

    if (!sourceId) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (url !== undefined) updateData.url = url;
    if (description !== undefined) updateData.description = description;
    if (approved !== undefined) updateData.approved = approved;
    if (order !== undefined) updateData.order = order;

    const source = await prisma.additionalSource.update({
      where: { id: sourceId },
      data: updateData,
    });

    return NextResponse.json({ source });
  } catch (error) {
    console.error('Error updating source:', error);
    return NextResponse.json(
      { error: 'Failed to update source' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a source
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');

    if (!sourceId) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }

    await prisma.additionalSource.delete({
      where: { id: sourceId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting source:', error);
    return NextResponse.json(
      { error: 'Failed to delete source' },
      { status: 500 }
    );
  }
}
