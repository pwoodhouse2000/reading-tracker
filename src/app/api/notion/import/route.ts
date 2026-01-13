import { NextRequest, NextResponse } from 'next/server';
import { importFromNotion, getLastImport } from '@/lib/services/notion';
import { requireAuth } from '@/lib/auth-guard';

// POST /api/notion/import (requires auth)
// Body: { databaseId }
// Uses NOTION_API_TOKEN from environment variables
export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  
  try {
    const apiToken = process.env.NOTION_API_TOKEN;

    if (!apiToken) {
      return NextResponse.json(
        { error: 'Notion API token not configured. Please set NOTION_API_TOKEN in .env file.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { databaseId } = body;

    if (!databaseId) {
      return NextResponse.json(
        { error: 'Database ID is required' },
        { status: 400 }
      );
    }

    const result = await importFromNotion(apiToken, databaseId);

    return NextResponse.json({
      success: true,
      ...result,
      message: `Successfully imported ${result.itemsImported} new books. ${result.skipped} already imported.`,
    });
  } catch (error) {
    console.error('Error in Notion import:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed'
      },
      { status: 500 }
    );
  }
}

// GET /api/notion/import
// Get last import information
export async function GET(request: NextRequest) {
  try {
    const lastImport = await getLastImport();

    return NextResponse.json({ lastImport });
  } catch (error) {
    console.error('Error fetching last import:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import history' },
      { status: 500 }
    );
  }
}
