import prisma from '@/lib/db';

export type LlmPurpose = 'summary' | 'keep-summary' | 'tags' | 'full-post' | 'sources';

export const LLM_BUDGETS: Record<LlmPurpose, { maxTokens: number; inputChars: number }> = {
  summary: { maxTokens: 160, inputChars: 1600 },
  'keep-summary': { maxTokens: 160, inputChars: 1600 },
  tags: { maxTokens: 80, inputChars: 1400 },
  'full-post': { maxTokens: 700, inputChars: 2800 },
  sources: { maxTokens: 500, inputChars: 900 },
};

const ET = 'America/New_York';

export function clipForPurpose(text: string, purpose: LlmPurpose) {
  return String(text || '').slice(0, LLM_BUDGETS[purpose].inputChars);
}

export function applyBudget(purpose: LlmPurpose, maxTokens?: number) {
  const budget = LLM_BUDGETS[purpose];
  return Math.min(maxTokens ?? budget.maxTokens, budget.maxTokens);
}

export function estimatePromptTokens(messages: { content?: string }[]) {
  const chars = messages.reduce((n, m) => n + String(m.content || '').length, 0);
  return Math.ceil(chars / 4);
}

function usdPerMillion(kind: 'prompt' | 'completion') {
  const key = kind === 'prompt' ? 'LLM_USD_PER_MILLION_PROMPT' : 'LLM_USD_PER_MILLION_COMPLETION';
  const n = Number(process.env[key]);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function estimateCost(promptTokens: number, completionTokens: number) {
  const prompt = (promptTokens / 1_000_000) * usdPerMillion('prompt');
  const completion = (completionTokens / 1_000_000) * usdPerMillion('completion');
  return Math.round((prompt + completion) * 1_000_000) / 1_000_000;
}

export async function recordLlmUsage(entry: {
  provider?: string;
  model: string;
  purpose: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimated?: boolean;
  ok?: boolean;
}) {
  try {
    const promptTokens = Math.max(0, Number(entry.promptTokens) || 0);
    const completionTokens = Math.max(0, Number(entry.completionTokens) || 0);
    const totalTokens = Math.max(0, Number(entry.totalTokens) || promptTokens + completionTokens);
    await prisma.llmUsage.create({
      data: {
        provider: entry.provider || 'openrouter',
        model: entry.model,
        purpose: entry.purpose,
        promptTokens,
        completionTokens,
        totalTokens,
        cost: estimateCost(promptTokens, completionTokens),
        estimated: Boolean(entry.estimated),
        ok: entry.ok !== false,
      },
    });
  } catch (error) {
    console.warn('Failed to record LLM usage', error);
  }
}

export function etYmd(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: ET });
}

export function etYesterdayYmd(now = new Date()) {
  const today = etYmd(now);
  const probe = new Date(now.getTime() - 36 * 60 * 60 * 1000);
  for (let i = 0; i < 48; i += 1) {
    const d = new Date(probe.getTime() + i * 60 * 60 * 1000);
    const ymd = etYmd(d);
    if (ymd < today) return ymd;
  }
  return today;
}

export function dailyTokenWarnLimit() {
  const n = Number(process.env.LLM_DAILY_TOKEN_WARN);
  return Number.isFinite(n) && n > 0 ? n : 200_000;
}

export async function buildLlmRollup(options?: { ymd?: string }) {
  const ymd = options?.ymd || etYesterdayYmd();
  const since = new Date(Date.now() - 60 * 60 * 60 * 1000);
  const rows = await prisma.llmUsage.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'asc' },
  });
  const dayRows = rows.filter((row) => etYmd(row.createdAt) === ymd);

  const totals = dayRows.reduce(
    (acc, row) => {
      acc.calls += 1;
      acc.promptTokens += row.promptTokens;
      acc.completionTokens += row.completionTokens;
      acc.totalTokens += row.totalTokens;
      acc.cost += row.cost || 0;
      acc.estimated += row.estimated ? 1 : 0;
      acc.failed += row.ok ? 0 : 1;
      return acc;
    },
    { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0, estimated: 0, failed: 0 }
  );

  const byPurpose = new Map<string, { calls: number; tokens: number }>();
  const models = new Set<string>();
  const providers = new Set<string>();
  for (const row of dayRows) {
    const cur = byPurpose.get(row.purpose) || { calls: 0, tokens: 0 };
    cur.calls += 1;
    cur.tokens += row.totalTokens;
    byPurpose.set(row.purpose, cur);
    models.add(row.model);
    providers.add(row.provider);
  }

  const purposeBits = [...byPurpose.entries()]
    .sort((a, b) => b[1].tokens - a[1].tokens)
    .map(([purpose, v]) => `${purpose} ${v.calls} · ${v.tokens.toLocaleString()}`);

  const warnLimit = dailyTokenWarnLimit();
  const warn = totals.totalTokens >= warnLimit;
  const model = [...models].join(', ') || 'n/a';
  const provider = [...providers].join(', ') || 'openrouter';
  const costBit = totals.cost > 0 ? ` · ~$${totals.cost.toFixed(4)}` : '';
  const estBit = totals.estimated ? ` · ${totals.estimated} estimated` : '';
  const failBit = totals.failed ? ` · ${totals.failed} failed` : '';
  const warnBit = warn ? ` · WARN over ${warnLimit.toLocaleString()} daily tokens` : '';

  const line =
    totals.calls === 0
      ? `phipi.me LLM (${ymd} ET): none`
      : `phipi.me LLM (${ymd} ET): ${totals.calls} calls · ${totals.totalTokens.toLocaleString()} tokens · ${provider} / ${model}${costBit}${estBit}${failBit}${warnBit}`;

  const text = purposeBits.length ? `${line}\n  ${purposeBits.join(' | ')}` : line;

  return {
    ymd,
    timezone: ET,
    totals,
    byPurpose: Object.fromEntries(byPurpose),
    models: [...models],
    providers: [...providers],
    warn,
    warnLimit,
    line,
    text,
  };
}
