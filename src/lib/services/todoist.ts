import { TodoistApi } from '@doist/todoist-api-typescript';
import { prisma } from '@/lib/prisma';
import { searchBooks, parseBookTitle } from './book-api';

export interface SyncResult {
  synced: number;
  errors: string[];
  skipped: number;
  enriched: number;
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
 * - Parses title/author from task content
 * - Searches for book information from multiple APIs
 * - Creates book entries in database with enriched data
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
    enriched: 0,
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

        // Parse the task content to extract title and possibly author
        // Supports formats like:
        // - "Atomic Habits"
        // - "Atomic Habits (James Clear)"
        // - "Atomic Habits - James Clear"
        // - "Atomic Habits by James Clear"
        const parsed = parseBookTitle(task.content);
        
        // Search for book information using parsed title and author
        const searchQuery = parsed.author 
          ? `${parsed.title} ${parsed.author}`
          : parsed.title;
        
        const bookResults = await searchBooks(searchQuery);
        const bookInfo = bookResults[0];

        // Determine category from task labels or default to NON_FICTION
        let category: 'FICTION' | 'NON_FICTION' = 'NON_FICTION';
        if (task.labels && task.labels.length > 0) {
          const labelNames = task.labels.join(',').toLowerCase();
          if (labelNames.includes('fiction')) {
            category = 'FICTION';
          }
        }

        // Determine priority from Todoist priority (reversed: 4 = high in Todoist)
        const priority = task.priority ? 5 - task.priority : undefined;

        // Create book entry with enriched data
        await prisma.book.create({
          data: {
            title: bookInfo?.title || parsed.title,
            author: bookInfo?.author || parsed.author || 'Unknown',
            status: 'TO_READ',
            category,
            mediaTypes: 'PAPER', // Default, user can change later
            summary: bookInfo?.summary,
            coverImageUrl: bookInfo?.coverImageUrl,
            isbn: bookInfo?.isbn,
            apiSource: bookInfo?.apiSource,
            priority,
            todoistTaskId: task.id,
            todoistSyncedAt: new Date(),
          },
        });

        // Track enrichment success
        if (bookInfo?.summary || bookInfo?.coverImageUrl) {
          result.enriched++;
        }

        // Mark task as complete in Todoist if requested
        if (autoComplete) {
          await api.closeTask(task.id);
        }

        result.synced++;

        // Small delay to avoid rate limiting the book APIs
        await new Promise(resolve => setTimeout(resolve, 200));
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
