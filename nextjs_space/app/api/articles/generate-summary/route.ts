import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST - Generate AI summary (streaming)
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

    if (!content || content.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Content is required for summary generation' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if content is too short or is placeholder text
    const trimmedContent = content.trim();
    if (trimmedContent.length < 50) {
      return new Response(JSON.stringify({ error: 'Content is too short to generate a meaningful summary. Please provide more content or use the AI generation tools.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if content contains Notion page instructions
    if (trimmedContent.includes('This is a Notion page') || trimmedContent.includes('manual content entry required')) {
      return new Response(JSON.stringify({ error: 'Please provide actual content instead of placeholder text. Use the "Generate Full Post" feature or manually enter content from the Notion page.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const messages = [
      {
        role: 'system',
        content:
          'You are an expert content summarizer for a cybersecurity and privacy-focused tech blog. Create concise, engaging summaries that capture the key points.',
      },
      {
        role: 'user',
        content: `Please create a compelling 2-3 sentence summary of the following article titled "${title || 'Article'}":

${trimmedContent.substring(0, 4000)}

Provide only the summary, no additional commentary.`,
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
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('LLM API error:', response.status, errText);
      return new Response(JSON.stringify({ error: `AI summary generation failed (${response.status}). Please try again.` }), {
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
    console.error('Error generating summary:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Failed to generate summary' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
