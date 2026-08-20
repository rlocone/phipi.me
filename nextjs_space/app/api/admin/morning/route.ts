import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildMorningQueue } from '@/lib/morning-queue';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const queue = await buildMorningQueue();
    return NextResponse.json(queue);
  } catch (error: any) {
    console.error('Morning queue GET failed', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load morning queue' },
      { status: 500 }
    );
  }
}
