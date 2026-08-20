import { NextRequest, NextResponse } from 'next/server';
import { buildLlmRollup } from '@/lib/llm-usage';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = process.env.LLM_ROLLUP_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rollup = await buildLlmRollup();
  if (request.nextUrl.searchParams.get('format') === 'json') {
    return NextResponse.json(rollup);
  }
  return new NextResponse(rollup.text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
