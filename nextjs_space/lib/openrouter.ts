import { applyBudget, estimatePromptTokens, recordLlmUsage, type LlmPurpose } from '@/lib/llm-usage';

type ChatMessage = {
  role: string;
  content: string;
};

type OpenRouterChatOptions = {
  messages: ChatMessage[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  response_format?: { type: string };
  purpose?: LlmPurpose;
};

export function getOpenRouterModel(fallback = 'openai/gpt-4.1-mini') {
  return process.env.OPENROUTER_MODEL || fallback;
}

export async function openRouterChatCompletions(options: OpenRouterChatOptions) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const model = getOpenRouterModel();
  const purpose = options.purpose;
  const maxTokens = purpose ? applyBudget(purpose, options.max_tokens) : options.max_tokens;
  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
    stream: options.stream,
    max_tokens: maxTokens,
    temperature: options.temperature,
    response_format: options.response_format,
  };
  if (options.stream) {
    body.stream_options = { include_usage: true };
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://phipi.me',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'phipi.me',
    },
    body: JSON.stringify(body),
  });

  if (purpose && !options.stream) {
    try {
      const clone = response.clone();
      const data = await clone.json();
      const usage = data?.usage || {};
      await recordLlmUsage({
        provider: 'openrouter',
        model,
        purpose,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        ok: response.ok,
      });
    } catch {
      await recordLlmUsage({
        provider: 'openrouter',
        model,
        purpose,
        promptTokens: estimatePromptTokens(options.messages),
        completionTokens: maxTokens || 0,
        estimated: true,
        ok: response.ok,
      });
    }
  } else if (purpose) {
    await recordLlmUsage({
      provider: 'openrouter',
      model,
      purpose,
      promptTokens: estimatePromptTokens(options.messages),
      completionTokens: maxTokens || 0,
      estimated: true,
      ok: response.ok,
    });
  }

  return response;
}
