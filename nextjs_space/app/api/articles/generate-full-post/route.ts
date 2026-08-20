import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/require-admin';
import { openRouterChatCompletions } from '@/lib/openrouter';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const { content, title, sources } = body;

    if (!content) {
      return new Response(JSON.stringify({ error: 'Content is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let citationContext = '';
    if (sources && sources.length > 0) {
      citationContext = `\n\nAdditional Reference Sources (cite these when relevant using [1], [2], etc.):\n${sources.map((s: any, i: number) => `[${i + 1}] ${s.title} - ${s.description || s.url}`).join('\n')}`;
    }

    const messages = [
      {
        role: 'system',
        content:
          'You are a skilled technical writer for a cybersecurity and privacy-focused tech publication. Transform the provided content into a well-structured, engaging article with clear sections. Maintain technical accuracy while making it accessible. Use markdown formatting. When additional sources are provided, naturally incorporate citations as [1], [2], etc. when referencing information from those sources.',
      },
      {
        role: 'user',
        content: `Please enhance and rewrite the following article titled "${title || 'Article'}" as a comprehensive blog post for our cybersecurity and privacy audience:\n\n${content.substring(0, 2800)}${citationContext}\n\nFormat the article with:\n- An engaging introduction\n- Clear section headings\n- Key insights highlighted\n- A brief conclusion\n- Use markdown formatting\n${sources && sources.length > 0 ? '- Add citations [1], [2], etc. when referencing the additional sources above' : ''}\n\nProvide only the enhanced article content.`,
      },
    ];

    const response = await openRouterChatCompletions({
      messages,
      stream: true,
      max_tokens: 700,
      purpose: 'full-post',
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('LLM API error (full post):', response.status, errText);
      return new Response(JSON.stringify({ error: `AI post generation failed (${response.status}). Please try again.` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();

        try {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;
            const chunk = decoder.decode(value);
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error generating full post:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Failed to generate full post' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
