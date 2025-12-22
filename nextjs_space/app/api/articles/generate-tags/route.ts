import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST - Auto-generate tags based on content (streaming with JSON response)
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

    // Get existing tags for context
    const existingTags = await prisma.tag.findMany({
      select: { name: true },
    });

    const tagList = existingTags.map((t: any) => t.name).join(', ');

    const messages = [
      {
        role: 'system',
        content:
          'You are a content tagging expert for a tech blog. Generate 3-6 relevant tags based on article content. Prefer existing tags when appropriate, but create new ones if needed.',
      },
      {
        role: 'user',
        content: `Analyze this article titled "${title || 'Article'}" and suggest 3-6 relevant tags:

${content.substring(0, 3000)}

Existing tags in our system: ${tagList || 'None yet'}

Respond in JSON format with the following structure:
{
  "tags": ["tag1", "tag2", "tag3"]
}

Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting. Each tag should be lowercase, 1-3 words.`,
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
        max_tokens: 200,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Failed to generate tags' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = '';
        let partialRead = '';

        try {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;

            partialRead += decoder.decode(value, { stream: true });
            let lines = partialRead.split('\n');
            partialRead = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  try {
                    const finalResult = JSON.parse(buffer);
                    const finalData = JSON.stringify({
                      status: 'completed',
                      result: finalResult,
                    });
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
                  } catch (e) {
                    console.error('Failed to parse final JSON:', e);
                    const errorData = JSON.stringify({
                      status: 'error',
                      message: 'Failed to parse response',
                    });
                    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
                  }
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  buffer += parsed.choices?.[0]?.delta?.content || '';
                  const progressData = JSON.stringify({
                    status: 'processing',
                    message: 'Generating tags',
                  });
                  controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
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
    console.error('Error generating tags:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Failed to generate tags' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
