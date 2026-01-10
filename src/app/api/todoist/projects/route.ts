import { NextRequest, NextResponse } from 'next/server';
import { getTodoistProjects } from '@/lib/services/todoist';

// GET /api/todoist/projects?token=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Todoist API token is required' },
        { status: 400 }
      );
    }

    const projects = await getTodoistProjects(token);

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching Todoist projects:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
