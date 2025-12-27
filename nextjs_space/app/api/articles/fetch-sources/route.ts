import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface Source {
  title: string;
  url: string;
  description: string;
}

/**
 * Fetches related sources for an article using web search
 * POST /api/articles/fetch-sources
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Use LLM API to generate search queries and find related sources
    const apiKey = process.env.ABACUSAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'LLM API not configured' },
        { status: 500 }
      );
    }

    // First, generate search queries
    const queryPrompt = `Given this article title: "${title}"
${content ? `And this content preview: ${content.slice(0, 500)}...` : ''}

Generate 3-5 specific search queries to find high-quality additional reading material on this topic. Return ONLY a JSON array of query strings, no other text.
Example: ["query 1", "query 2", "query 3"]`;

    const queryResponse = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates search queries. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: queryPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
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
      // Fallback to basic query
      queries = [title];
    }

    // Now search for sources using the generated queries
    const sourcePrompt = `I need to find 5 high-quality additional reading sources for an article titled: "${title}"

Search queries:
${queries.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Generate 5 relevant, authoritative sources (real or realistic) that would provide additional reading on this topic. For each source provide:
- title: A clear, descriptive title
- url: A realistic URL (use real domains like techcrunch.com, arstechnica.com, ieee.org, medium.com, etc.)
- description: A brief 1-2 sentence description of what the source covers

Return ONLY a JSON array in this exact format, no other text:
[
  {
    "title": "Source Title",
    "url": "https://example.com/article",
    "description": "Brief description"
  }
]

IMPORTANT: Return ONLY the JSON array, no markdown, no code blocks, no other text.`;

    const sourceResponse = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant that finds relevant sources. Always respond with valid JSON only, no markdown formatting.'
          },
          {
            role: 'user',
            content: sourcePrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!sourceResponse.ok) {
      throw new Error('Failed to generate sources');
    }

    const sourceData = await sourceResponse.json();
    let sourcesText = sourceData.choices[0]?.message?.content || '[]';
    
    // Clean up markdown code blocks if present
    sourcesText = sourcesText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let sources: Source[];
    try {
      sources = JSON.parse(sourcesText);
      
      // Validate and clean sources
      sources = sources
        .filter(s => s.title && s.url && s.description)
        .slice(0, 5)
        .map((s, index) => ({
          title: s.title.trim(),
          url: s.url.trim(),
          description: s.description.trim(),
        }));
        
    } catch (error) {
      console.error('Failed to parse sources:', error);
      console.error('Raw response:', sourcesText);
      // Return empty array on parse error
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
