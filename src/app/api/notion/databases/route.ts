import { NextRequest, NextResponse } from 'next/server';
import { getNotionDatabases } from '@/lib/services/notion';

// GET /api/notion/databases
// Uses NOTION_API_TOKEN from environment variables
export async function GET(request: NextRequest) {
  try {
    const token = process.env.NOTION_API_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: 'Notion API token not configured. Please set NOTION_API_TOKEN in .env file.' },
        { status: 400 }
      );
    }

    const databases = await getNotionDatabases(token);

    return NextResponse.json({ databases });
  } catch (error) {
    console.error('Error fetching Notion databases:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch databases' },
      { status: 500 }
    );
  }
}
