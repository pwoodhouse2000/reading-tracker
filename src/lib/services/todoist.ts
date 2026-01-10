import { TodoistApi } from '@doist/todoist-api-typescript';
import { prisma } from '@/lib/prisma';
import { searchBooks } from './book-api';

export interface SyncResult {
  synced: number;
  errors: string[];
  skipped: number;
}

/**
 * Get all projects from Todoist to help user select the right one
 */
export async function getTodoistProjects(apiToken: string) {
  try {
    const api = new TodoistApi(apiToken);
    const projectsResponse = await api.getProjects();

    // Handle the response which might be an array or an object with a data property
    const projectsArray = Array.isArray(projectsResponse)
      ? projectsResponse
      : (projectsResponse as any).data || [];

    return projectsArray.map((p: any) => ({
      id: p.id,
      name: p.name,
    }));
  } catch (error) {
    console.error('Error fetching Todoist projects:', error);
    throw new Error('Failed to fetch Todoist projects. Please check your API token.');
  }
}

/**
 * Sync reading list from Todoist
 * - Fetches tasks from specified project
 * - Searches for book information
 * - Creates book entries in database
 * - Marks tasks as complete in Todoist (if autoComplete is true)
 */
export async function syncTodoistReadingList(
  apiToken: string,
  projectId: string,
  autoComplete = true
): Promise<SyncResult> {
  const api = new TodoistApi(apiToken);
  const result: SyncResult = {
    synced: 0,
    errors: [],
    skipped: 0,
  };

  try {
    // Fetch tasks from the specified project
    const tasksResponse = await api.getTasks({ projectId });

    // Handle the response which might be an array or an object with a data property
    const tasksArray = Array.isArray(tasksResponse)
      ? tasksResponse
      : (tasksResponse as any).data || [];

    for (const task of tasksArray) {
      try {
        // Check if this task was already synced
        const existing = await prisma.book.findUnique({
          where: { todoistTaskId: task.id },
        });

        if (existing) {
          result.skipped++;
          continue;
        }

        // Search for book information using the task content
        const bookInfo = await searchBooks(task.content);
        const firstResult = bookInfo[0];

        // Determine category from task labels or default to NON_FICTION
        let category: 'FICTION' | 'NON_FICTION' = 'NON_FICTION';
        if (task.labels && task.labels.length > 0) {
          const labelNames = task.labels.join(',').toLowerCase();
          if (labelNames.includes('fiction')) {
            category = 'FICTION';
          }
        }

        // Create book entry
        await prisma.book.create({
          data: {
            title: firstResult?.title || task.content,
            author: firstResult?.author || 'Unknown',
            status: 'TO_READ',
            category,
            mediaType: 'PAPER', // Default, user can change later
            summary: firstResult?.summary,
            coverImageUrl: firstResult?.coverImageUrl,
            isbn: firstResult?.isbn,
            apiSource: firstResult ? 'open_library' : undefined,
            todoistTaskId: task.id,
            todoistSyncedAt: new Date(),
          },
        });

        // Mark task as complete in Todoist if requested
        if (autoComplete) {
          await api.closeTask(task.id);
        }

        result.synced++;
      } catch (error) {
        console.error(`Error syncing task "${task.content}":`, error);
        result.errors.push(`Failed to sync: ${task.content}`);
      }
    }

    // Record sync in database
    await prisma.todoistSync.create({
      data: {
        projectId,
        lastSyncedAt: new Date(),
        syncStatus: result.errors.length > 0 ? 'partial' : 'success',
        errorMessage: result.errors.length > 0 ? result.errors.join('; ') : null,
        itemsSynced: result.synced,
      },
    });

    return result;
  } catch (error) {
    console.error('Error in Todoist sync:', error);
    throw new Error('Failed to sync with Todoist. Please check your settings.');
  }
}

/**
 * Get last sync information
 */
export async function getLastSync(projectId?: string) {
  const lastSync = await prisma.todoistSync.findFirst({
    where: projectId ? { projectId } : undefined,
    orderBy: { lastSyncedAt: 'desc' },
  });

  return lastSync;
}
