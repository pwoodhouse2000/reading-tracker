import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// GET /api/ai/recommendations - Get AI-powered book recommendations
export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'AI features not configured. Please add OPENAI_API_KEY.' },
      { status: 503 }
    );
  }

  try {
    // Get user's reading history for context
    const [finishedBooks, currentlyReading, toReadBooks] = await Promise.all([
      prisma.book.findMany({
        where: { status: 'FINISHED' },
        select: {
          title: true,
          author: true,
          category: true,
          subCategory: true,
          rating: true,
        },
        orderBy: { dateFinished: 'desc' },
        take: 20,
      }),
      prisma.book.findMany({
        where: { status: 'READING' },
        select: { title: true, author: true },
      }),
      prisma.book.findMany({
        where: { status: { in: ['TO_READ', 'NEXT_UP'] } },
        select: { title: true, author: true },
        take: 10,
      }),
    ]);

    // Build context for AI
    const highRatedBooks = finishedBooks.filter(b => b.rating && b.rating >= 4);
    const favoriteAuthors = [...new Set(highRatedBooks.map(b => b.author))].slice(0, 5);
    const favoriteGenres = [...new Set(highRatedBooks.map(b => b.subCategory).filter(Boolean))].slice(0, 5);
    
    const readingProfile = {
      recentlyFinished: finishedBooks.slice(0, 10).map(b => `${b.title} by ${b.author} (${b.rating ? b.rating + '★' : 'unrated'})`),
      highlyRated: highRatedBooks.slice(0, 5).map(b => `${b.title} by ${b.author}`),
      favoriteAuthors,
      favoriteGenres,
      currentlyReading: currentlyReading.map(b => `${b.title} by ${b.author}`),
      alreadyOnList: toReadBooks.map(b => `${b.title} by ${b.author}`),
    };

    const systemPrompt = `You are a thoughtful book recommendation assistant. Based on the user's reading history, suggest 5 books they might enjoy. 

Be specific and explain WHY each book would appeal to them based on their preferences. Consider:
- Authors they've enjoyed
- Genres/themes they gravitate toward
- Rating patterns (what they rated highly)
- Avoid recommending books they've already read or have on their to-read list

Format your response as a JSON array with objects containing:
- title: string
- author: string  
- reason: string (2-3 sentences explaining why this book matches their taste)
- confidence: "high" | "medium" (based on how well it matches their preferences)`;

    const userPrompt = `Here's my reading profile:

Recently finished books:
${readingProfile.recentlyFinished.join('\n')}

Books I rated highly (4-5 stars):
${readingProfile.highlyRated.join('\n') || 'None yet'}

Favorite authors: ${favoriteAuthors.join(', ') || 'Still discovering'}
Favorite genres: ${favoriteGenres.join(', ') || 'Various'}

Currently reading: ${readingProfile.currentlyReading.join(', ') || 'Nothing right now'}

Already on my to-read list (don't recommend these):
${readingProfile.alreadyOnList.join('\n') || 'Empty list'}

Please recommend 5 books I might enjoy, with explanations.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      
      // Parse and return more helpful error messages
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
          { error: 'OpenAI API error', details: errorMessage },
          { status: 500 }
        );
      } catch {
        return NextResponse.json(
          { error: 'Failed to get recommendations', details: errorText },
          { status: 500 }
        );
      }
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '[]';
    
    // Parse the JSON response
    let recommendations;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      console.error('Failed to parse recommendations:', content);
      recommendations = [];
    }

    return NextResponse.json({
      recommendations,
      context: {
        booksAnalyzed: finishedBooks.length,
        favoriteAuthors,
        favoriteGenres,
      },
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}
