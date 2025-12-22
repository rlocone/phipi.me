import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST - Approve article
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const article = await prisma.article.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        publishedAt: new Date(),
      },
    });

    return NextResponse.json({ article });
  } catch (error) {
    console.error('Error approving article:', error);
    return NextResponse.json(
      { error: 'Failed to approve article' },
      { status: 500 }
    );
  }
}
