import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Get single RSS feed
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const feed = await prisma.rSSFeed.findUnique({
      where: { id: params.id },
    });

    if (!feed) {
      return NextResponse.json({ error: 'RSS feed not found' }, { status: 404 });
    }

    return NextResponse.json({ feed });
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RSS feed' },
      { status: 500 }
    );
  }
}

// PATCH - Update RSS feed
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
    const { name, feedUrl, autoFetchEnabled } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (feedUrl !== undefined) updateData.feedUrl = feedUrl;
    if (autoFetchEnabled !== undefined) updateData.autoFetchEnabled = autoFetchEnabled;

    const feed = await prisma.rSSFeed.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ feed });
  } catch (error) {
    console.error('Error updating RSS feed:', error);
    return NextResponse.json(
      { error: 'Failed to update RSS feed' },
      { status: 500 }
    );
  }
}

// DELETE - Delete RSS feed
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.rSSFeed.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting RSS feed:', error);
    return NextResponse.json(
      { error: 'Failed to delete RSS feed' },
      { status: 500 }
    );
  }
}
