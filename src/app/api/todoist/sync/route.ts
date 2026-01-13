import { NextRequest, NextResponse } from 'next/server';
import { syncTodoistReadingList, getLastSync } from '@/lib/services/todoist';
import { requireAuth } from '@/lib/auth-guard';

// POST /api/todoist/sync (requires auth)
// Body: { projectId, autoComplete }
// Uses TODOIST_API_TOKEN from environment variables
export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  
  try {
    const apiToken = process.env.TODOIST_API_TOKEN;

    if (!apiToken) {
      return NextResponse.json(
        { error: 'Todoist API token not configured. Please set TODOIST_API_TOKEN in .env file.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { projectId, autoComplete = true } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const result = await syncTodoistReadingList(apiToken, projectId, autoComplete);

    return NextResponse.json({
      success: true,
      ...result,
      message: `Successfully synced ${result.synced} books (${result.enriched} with covers/summaries). ${result.skipped} already synced.`,
    });
  } catch (error) {
    console.error('Error in Todoist sync:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      },
      { status: 500 }
    );
  }
}

// GET /api/todoist/sync?projectId=xxx
// Get last sync information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || undefined;

    const lastSync = await getLastSync(projectId);

    return NextResponse.json({ lastSync });
  } catch (error) {
    console.error('Error fetching last sync:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync history' },
      { status: 500 }
    );
  }
}
