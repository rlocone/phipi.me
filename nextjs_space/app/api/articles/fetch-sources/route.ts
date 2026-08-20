import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/require-admin';
import { openRouterChatCompletions } from '@/lib/openrouter';

export const dynamic = 'force-dynamic';

interface Source {
  title: string;
  url: string;
  description: string;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const { title, content } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'LLM API not configured' }, { status: 500 });
    }

    const queryPrompt = `Given this article title: "${title}"\n${content ? `And this content preview: ${content.slice(0, 500)}...` : ''}\n\nGenerate 3-5 specific search queries to find high-quality additional reading material on this topic. Return ONLY a JSON array of query strings, no other text.\nExample: ["query 1", "query 2", "query 3"]`;

    const queryResponse = await openRouterChatCompletions({
      messages: [
        { role: 'system', content: 'You are a helpful assistant that generates search queries. Always respond with valid JSON only.' },
        { role: 'user', content: queryPrompt },
      ],
      temperature: 0.7,
      max_tokens: 350,
      purpose: 'sources',
    });

    if (!queryResponse.ok) {
      throw new Error('Failed to generate search queries');
    }

    const queryData = await queryResponse.json();
    const queriesText = queryData.choices[0]?.message?.content || '[]';
    let queries: string[];
    try {
      queries = JSON.parse(queriesText);
    } catch {
      queries = [title];
    }

    const sourcePrompt = `I need to find 5 high-quality additional reading sources for an article titled: "${title}"\n\nSearch queries:\n${queries.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nGenerate 5 relevant, authoritative sources (real or realistic) that would provide additional reading on this topic. For each source provide:\n- title: A clear, descriptive title\n- url: A realistic URL (use real domains like techcrunch.com, cirktechnica.com, ieee.org, medium.com, etc.)\n- description: A brief 1-2 sentence description of what the source covers\n\nReturn ONLY a JSON array in this exact format, no other text:\n[\n  {\n    "title": "Source Title",\n    "url": "https://example.com/article",\n    "description": "Brief description"\n  }\n]\n\nIMPORTANT: Return ONLY the JSON array, no markdown, no code blocks, no other text.`;

    const sourceResponse = await openRouterChatCompletions({
      messages: [
        { role: 'system', content: 'You are a research assistant that finds relevant sources. Always respond with valid JSON only, no markdown formatting.' },
        { role: 'user', content: sourcePrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
      purpose: 'sources',
    });

    if (!sourceResponse.ok) {
      throw new Error('Failed to generate sources');
    }

    const sourceData = await sourceResponse.json();
    let sourcesText = sourceData.choices[0]?.message?.content || '[]';
    sourcesText = sourcesText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let sources: Source[];
    try {
      sources = JSON.parse(sourcesText);
      sources = sources
        .filter((s: Source) => s.title && s.url && s.description)
        .slice(0, 5)
        .map((s) => ({
          title: s.title.trim(),
          url: s.url.trim(),
          description: s.description.trim(),
        }));
    } catch (error) {
      console.error('Failed to parse sources:', error);
      console.error('Raw response:', sourcesText);
      sources = [];
    }

    return NextResponse.json({ sources });
  } catch (error: any) {
    console.error('Error fetching sources:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}
