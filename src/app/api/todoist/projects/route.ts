import { NextRequest, NextResponse } from 'next/server';
import { getTodoistProjects } from '@/lib/services/todoist';

// GET /api/todoist/projects
// Uses TODOIST_API_TOKEN from environment variables
export async function GET(request: NextRequest) {
  try {
    const token = process.env.TODOIST_API_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: 'Todoist API token not configured. Please set TODOIST_API_TOKEN in .env file.' },
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
