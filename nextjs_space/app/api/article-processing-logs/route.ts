import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

function oneLine(value: unknown, max = 300): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, max) : undefined;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  return session && role === 'admin' ? session : null;
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || 50), 200);
  const logs = await prisma.articleProcessingLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: Number.isFinite(limit) ? limit : 50,
  });
  return NextResponse.json({ logs });
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const log = await prisma.articleProcessingLog.create({
      data: {
        url: oneLine(body.url, 2000)!,
        title: oneLine(body.title, 500),
        status: oneLine(body.status, 40) || 'processing',
        stage: oneLine(body.stage, 80),
        errorMessage: oneLine(body.errorMessage),
        details: body.details && typeof body.details === 'object' ? body.details : undefined,
      },
    });
    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    console.error('Error creating article processing log:', error);
    return NextResponse.json({ error: 'Failed to create processing log' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'Log ID is required' }, { status: 400 });

    const status = oneLine(body.status, 40);
    const data: Record<string, unknown> = {
      ...(body.title !== undefined ? { title: oneLine(body.title, 500) } : {}),
      ...(status ? { status } : {}),
      ...(body.stage !== undefined ? { stage: oneLine(body.stage, 80) } : {}),
      ...(body.errorMessage !== undefined ? { errorMessage: oneLine(body.errorMessage) } : {}),
      ...(body.details !== undefined ? { details: body.details } : {}),
      ...(status === 'saved' || status === 'error' ? { finishedAt: new Date() } : {}),
    };

    const log = await prisma.articleProcessingLog.update({
      where: { id: String(body.id) },
      data,
    });
    return NextResponse.json({ log });
  } catch (error) {
    console.error('Error updating article processing log:', error);
    return NextResponse.json({ error: 'Failed to update processing log' }, { status: 500 });
  }
}
