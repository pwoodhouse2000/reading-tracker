import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// POST /api/ai/chat - Chat about reading history
export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'AI features not configured. Please add OPENAI_API_KEY.' },
      { status: 503 }
    );
  }

  try {
    const { message, history = [] } = await request.json() as { 
      message: string; 
      history: Message[];
    };

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get comprehensive reading data for context
    const [allBooks, notes, goals] = await Promise.all([
      prisma.book.findMany({
        select: {
          title: true,
          author: true,
          status: true,
          category: true,
          subCategory: true,
          rating: true,
          dateStarted: true,
          dateFinished: true,
          thoughts: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.note.findMany({
        select: {
          content: true,
          page: true,
          book: {
            select: { title: true, author: true },
          },
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.readingGoal.findMany({
        orderBy: { year: 'desc' },
        take: 2,
      }),
    ]);

    // Organize data by status
    const finished = allBooks.filter(b => b.status === 'FINISHED');
    const reading = allBooks.filter(b => b.status === 'READING');
    const toRead = allBooks.filter(b => b.status === 'TO_READ' || b.status === 'NEXT_UP');

    // Calculate stats
    const currentYear = new Date().getFullYear();
    const booksThisYear = finished.filter(b => 
      b.dateFinished && new Date(b.dateFinished).getFullYear() === currentYear
    );
    const avgRating = finished.filter(b => b.rating).reduce((sum, b) => sum + (b.rating || 0), 0) / 
      (finished.filter(b => b.rating).length || 1);

    // Build context
    const readingContext = `
## Your Reading Library

### Statistics
- Total books tracked: ${allBooks.length}
- Books finished: ${finished.length}
- Currently reading: ${reading.length}
- Books to read: ${toRead.length}
- Books finished this year (${currentYear}): ${booksThisYear.length}
- Average rating: ${avgRating.toFixed(1)} stars

### Reading Goal
${goals[0] ? `${goals[0].year} goal: ${goals[0].targetBooks} books` : 'No goal set'}

### Currently Reading
${reading.map(b => `- "${b.title}" by ${b.author}`).join('\n') || 'Nothing currently'}

### Recently Finished (last 10)
${finished.slice(0, 10).map(b => 
  `- "${b.title}" by ${b.author}${b.rating ? ` (${b.rating}★)` : ''}${b.thoughts ? ` - Your thoughts: "${b.thoughts.slice(0, 100)}..."` : ''}`
).join('\n') || 'None yet'}

### Highly Rated Books (4-5 stars)
${finished.filter(b => b.rating && b.rating >= 4).slice(0, 10).map(b => 
  `- "${b.title}" by ${b.author} (${b.rating}★)`
).join('\n') || 'None yet'}

### Books by Category
- Fiction: ${allBooks.filter(b => b.category === 'FICTION').length}
- Non-Fiction: ${allBooks.filter(b => b.category === 'NON_FICTION').length}

### Your Notes (recent)
${notes.slice(0, 10).map(n => 
  `- From "${n.book.title}": "${n.content.slice(0, 100)}..."`
).join('\n') || 'No notes yet'}

### To Read List
${toRead.slice(0, 10).map(b => `- "${b.title}" by ${b.author}`).join('\n') || 'Empty'}
`;

    const systemPrompt = `You are a helpful reading companion assistant for Pete's Reading Tracker. You have access to the user's complete reading history and can help them:

- Analyze their reading patterns and habits
- Discuss books they've read
- Recall notes and thoughts about specific books
- Answer questions about their reading statistics
- Suggest what to read next from their to-read list
- Help them reflect on their reading journey

Be conversational, helpful, and reference specific books from their library when relevant. If they ask about a book not in their library, you can still discuss it but mention you don't see it in their tracked books.

Here's their current reading data:
${readingContext}

Keep responses concise but informative. Use their actual book titles and authors when relevant.`;

    // Build messages array with history
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: message },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 800,
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
          { error: 'AI error', details: errorMessage },
          { status: 500 }
        );
      } catch {
        return NextResponse.json(
          { error: 'Failed to get response', details: errorText },
          { status: 500 }
        );
      }
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    );
  }
}
