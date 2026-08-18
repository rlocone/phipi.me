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
};

export function getOpenRouterModel(fallback = 'openai/gpt-4.1-mini') {
  return process.env.OPENROUTER_MODEL || fallback;
}

export async function openRouterChatCompletions(options: OpenRouterChatOptions) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://phipi.me',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'phipi.me',
    },
    body: JSON.stringify({
      model: getOpenRouterModel(),
      ...options,
    }),
  });
}
