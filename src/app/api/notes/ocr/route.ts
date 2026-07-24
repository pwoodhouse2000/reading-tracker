import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ~5MB image → ~6.7M base64 chars; reject larger payloads
const MAX_BASE64_LENGTH = 7_000_000;

// POST /api/notes/ocr - Extract printed text from a photo via OpenAI vision
export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'AI features not configured. Please add OPENAI_API_KEY.' },
      { status: 503 }
    );
  }

  try {
    const { image, bookId } = await request.json() as {
      image?: string;
      bookId?: string;
    };

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    if (!bookId || typeof bookId !== 'string') {
      return NextResponse.json(
        { error: 'Book ID is required' },
        { status: 400 }
      );
    }

    // Accept raw base64 or a data URI
    const base64Match = image.match(/^data:(image\/[a-zA-Z+]+);base64,([\s\S]+)$/);
    const mimeType = base64Match ? base64Match[1] : 'image/jpeg';
    const base64Data = base64Match ? base64Match[2] : image;

    if (base64Data.length > MAX_BASE64_LENGTH) {
      return NextResponse.json(
        { error: 'Image is too large. Please use a smaller photo.' },
        { status: 413 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract the printed text from this photo of a book page verbatim. '
                  + 'Return only the visible passage of text, trimmed to what is shown — '
                  + 'no commentary, no transcription notes, no surrounding quotes unless they appear in the text itself.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`,
                },
              },
            ],
          },
        ],
        temperature: 0,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);

      try {
        const errorJson = JSON.parse(errorText);
        const errorMessage = errorJson.error?.message || 'Unknown error';

        if (errorMessage.includes('quota')) {
          return NextResponse.json(
            {
              error: 'OpenAI quota exceeded',
              details: 'The API key has reached its usage limit. Please check your OpenAI billing settings.',
              code: 'QUOTA_EXCEEDED'
            },
            { status: 429 }
          );
        }

        if (errorMessage.includes('invalid_api_key') || errorMessage.includes('Incorrect API key')) {
          return NextResponse.json(
            {
              error: 'Invalid API key',
              details: 'The OpenAI API key is invalid. Please check your configuration.',
              code: 'INVALID_KEY'
            },
            { status: 401 }
          );
        }

        return NextResponse.json(
          { error: 'OCR failed', details: errorMessage },
          { status: 500 }
        );
      } catch {
        return NextResponse.json(
          { error: 'Failed to extract text', details: errorText },
          { status: 500 }
        );
      }
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content?.trim() || '';

    if (!text) {
      return NextResponse.json(
        { error: 'No text could be extracted from the image' },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Error in OCR:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
}
