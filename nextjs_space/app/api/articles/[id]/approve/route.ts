import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/require-admin';

export const dynamic = 'force-dynamic';

// POST - Approve article
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

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
