import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/require-admin';
import { buildLlmRollup } from '@/lib/llm-usage';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const period = request.nextUrl.searchParams.get('period') || 'weekly';
  const format = request.nextUrl.searchParams.get('format') || 'json';
  const days = period === 'yesterday' || period === 'daily' ? 2 : Math.min(Number(request.nextUrl.searchParams.get('days') || 7), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rollup = await buildLlmRollup();

  if (format === 'text') {
    return new NextResponse(rollup.text, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const [rows, grouped] = await Promise.all([
    prisma.llmUsage.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.llmUsage.groupBy({
      by: ['purpose', 'model', 'provider'],
      where: { createdAt: { gte: since } },
      _sum: { promptTokens: true, completionTokens: true, totalTokens: true, cost: true },
      _count: true,
    }),
  ]);

  const totals = grouped.reduce(
    (acc, row) => {
      acc.calls += row._count;
      acc.promptTokens += row._sum.promptTokens || 0;
      acc.completionTokens += row._sum.completionTokens || 0;
      acc.totalTokens += row._sum.totalTokens || 0;
      acc.cost += row._sum.cost || 0;
      return acc;
    },
    { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 }
  );

  return NextResponse.json({ since, period, totals, byPurpose: grouped, rows, rollup });
}
