import prisma from '@/lib/db';
import { buildLlmRollup } from '@/lib/llm-usage';

export const dynamic = 'force-dynamic';

export default async function LlmUsagePage() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [rows, grouped, rollup] = await Promise.all([
    prisma.llmUsage.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.llmUsage.groupBy({
      by: ['provider', 'model', 'purpose'],
      where: { createdAt: { gte: since } },
      _sum: { totalTokens: true, promptTokens: true, completionTokens: true, cost: true },
      _count: true,
    }),
    buildLlmRollup(),
  ]);
  const total = grouped.reduce((n, r) => n + (r._sum.totalTokens || 0), 0);

  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-3xl font-bold">LLM usage</h1>
        <p className="text-gray-400">Last 7 days · {total.toLocaleString()} tokens</p>
      </div>
      <pre className="whitespace-pre-wrap rounded-lg border border-purple-500/20 bg-gray-900/40 p-4 text-sm text-purple-100">{rollup.text}</pre>
      <div className="grid gap-3 sm:grid-cols-2">
        {grouped.map((row) => (
          <div key={`${row.provider}-${row.model}-${row.purpose}`} className="rounded-lg border border-purple-500/20 bg-gray-900/40 p-4">
            <div className="text-sm text-purple-300">{row.purpose}</div>
            <div className="text-xl font-semibold">{(row._sum.totalTokens || 0).toLocaleString()} tokens</div>
            <div className="text-xs text-gray-400">{row._count} calls · {row.provider} / {row.model}</div>
          </div>
        ))}
        {grouped.length === 0 && <p className="text-gray-400">No LLM calls yet.</p>}
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-gray-400">
          <tr>
            <th className="py-2">When</th>
            <th>Provider</th>
            <th>Model</th>
            <th>Purpose</th>
            <th>Tokens</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-white/10">
              <td className="py-2 text-gray-400">{row.createdAt.toLocaleString('en-US', { timeZone: 'America/New_York' })}</td>
              <td>{row.provider}</td>
              <td className="text-gray-400">{row.model}</td>
              <td>{row.purpose}{row.estimated ? ' *' : ''}</td>
              <td>{row.totalTokens}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
