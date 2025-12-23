import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST - Generate images for an article using AI
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, count = 1 } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Generate a descriptive prompt for image generation
    const imagePrompt = generateImagePrompt(title, content);

    // For now, return a placeholder response
    // In production, this would call an image generation API
    return NextResponse.json({
      images: [],
      prompt: imagePrompt,
      message: 'Image generation is not yet implemented. Images should be extracted from source.',
    });
  } catch (error: any) {
    console.error('Error generating images:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate images' },
      { status: 500 }
    );
  }
}

function generateImagePrompt(title: string, content?: string): string {
  // Create a descriptive prompt based on the article title and content
  const excerpt = content ? content.slice(0, 200) : '';
  return `Create a professional, tech-themed image for an article titled "${title}". ${excerpt ? `The article discusses: ${excerpt}...` : ''} Style: Modern, clean, tech-focused with purple accents.`;
}
