import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST - Generate AI-enhanced full post (streaming)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { content, title } = body;

    if (!content) {
      return new Response(JSON.stringify({ error: 'Content is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const messages = [
      {
        role: 'system',
        content:
          'You are a skilled technical writer for a cybersecurity and privacy-focused tech publication. Transform the provided content into a well-structured, engaging article with clear sections. Maintain technical accuracy while making it accessible. Use markdown formatting.',
      },
      {
        role: 'user',
        content: `Please enhance and rewrite the following article titled "${title || 'Article'}" as a comprehensive blog post for our cybersecurity and privacy audience:

${content.substring(0, 8000)}

Format the article with:
- An engaging introduction
- Clear section headings
- Key insights highlighted
- A brief conclusion
- Use markdown formatting

Provide only the enhanced article content.`,
      },
    ];

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: messages,
        stream: true,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Failed to generate full post' }), {
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
