import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const id = typeof body?.id === 'string' ? body.id : null;
    return NextResponse.json({ ok: true, id });
  } catch (error: any) {
    console.error('Morning queue toss failed', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to toss item' },
      { status: 500 }
    );
  }
}
