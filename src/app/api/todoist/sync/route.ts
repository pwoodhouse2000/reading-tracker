import { NextRequest, NextResponse } from 'next/server';
import { syncTodoistReadingList, getLastSync } from '@/lib/services/todoist';

// POST /api/todoist/sync
// Body: { apiToken, projectId, autoComplete }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiToken, projectId, autoComplete = true } = body;

    if (!apiToken || !projectId) {
      return NextResponse.json(
        { error: 'API token and project ID are required' },
        { status: 400 }
      );
    }

    const result = await syncTodoistReadingList(apiToken, projectId, autoComplete);

    return NextResponse.json({
      success: true,
      ...result,
      message: `Successfully synced ${result.synced} books. ${result.skipped} already synced.`,
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
