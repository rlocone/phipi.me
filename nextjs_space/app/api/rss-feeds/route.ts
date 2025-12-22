import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - List all RSS feeds
export async function GET(request: NextRequest) {
  try {
    const feeds = await prisma.rSSFeed.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ feeds });
  } catch (error) {
    console.error('Error fetching RSS feeds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RSS feeds' },
      { status: 500 }
    );
  }
}

// POST - Create new RSS feed
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, feedUrl, autoFetchEnabled } = body;

    if (!name || !feedUrl) {
      return NextResponse.json(
        { error: 'Name and feed URL are required' },
        { status: 400 }
      );
    }

    const feed = await prisma.rSSFeed.create({
      data: {
        name,
        feedUrl,
        autoFetchEnabled: autoFetchEnabled ?? true,
      },
    });

    return NextResponse.json({ feed }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating RSS feed:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'RSS feed with this URL already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create RSS feed' },
      { status: 500 }
    );
  }
}
