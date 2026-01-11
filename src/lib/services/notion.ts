import { Client } from '@notionhq/client';
import { prisma } from '@/lib/prisma';
import { ReadingStatus, Category } from '@prisma/client';

interface NotionPropertyValue {
  id: string;
  type: string;
  [key: string]: any;
}

interface NotionPage {
  id: string;
  properties: Record<string, NotionPropertyValue>;
}

export async function getNotionDatabases(apiToken: string) {
  const notion = new Client({ auth: apiToken });

  try {
    // Search without filters and manually filter for databases
    const response = await notion.search({
      page_size: 100,
    });

    return response.results
      .filter((item: any) => item.object === 'database')
      .map((db: any) => ({
        id: db.id,
        name: db.title?.[0]?.plain_text || 'Untitled Database',
      }));
  } catch (error) {
    console.error('Error fetching Notion databases:', error);
    throw new Error('Failed to fetch Notion databases');
  }
}

export async function importFromNotion(
  apiToken: string,
  databaseId: string
) {
  try {
    // Fetch all pages from the database with pagination
    let allResults: any[] = [];
    let hasMore = true;
    let startCursor: string | undefined = undefined;

    while (hasMore) {
      const response: Response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_cursor: startCursor,
          page_size: 100,
        }),
      });

      if (!response.ok) {
        const errorData: { message?: string } = await response.json();
        throw new Error(errorData.message || 'Failed to query database');
      }

      const data: { results: unknown[]; has_more: boolean; next_cursor?: string } = await response.json();
      allResults = allResults.concat(data.results);
      hasMore = data.has_more;
      startCursor = data.next_cursor;
    }

    const books = allResults.map((page: any) => {
      const props = page.properties;

      // Extract property values based on Notion property types
      const title = extractTitle(props.Name);
      const authorArray = extractMultiSelect(props['Author(s)']);
      const author = authorArray && authorArray.length > 0 ? authorArray[0] : 'Unknown';
      const rating = extractNumber(props.Rating);
      const status = mapNotionStatus(extractSelect(props.Status));
      const media = extractMultiSelect(props.Media);
      const mediaTypes = mapNotionMediaType(media);
      const category = mapNotionCategory(extractSelect(props.Category));
      const subCategoryArray = extractMultiSelect(props['Sub-Category']);
      const subCategory = subCategoryArray && subCategoryArray.length > 0 ? subCategoryArray.join(', ') : null;
      const priority = mapNotionPriority(extractSelect(props.Priority));
      const dateFinished = extractDate(props['Date Finished']);

      return {
        title: title || 'Untitled',
        author,
        status,
        category,
        subCategory,
        mediaTypes,
        rating,
        dateFinished,
        priority,
        notionPageId: page.id,
        importedFromNotion: true,
      };
    });

    // Filter out any books that are already imported (by notionPageId)
    const existingNotionIds = await prisma.book.findMany({
      where: {
        notionPageId: {
          in: books.map((b: any) => b.notionPageId),
        },
      },
      select: { notionPageId: true },
    });

    const existingIds = new Set(existingNotionIds.map((b: any) => b.notionPageId));
    const newBooks = books.filter((b: any) => !existingIds.has(b.notionPageId));

    // Bulk insert new books
    if (newBooks.length > 0) {
      await prisma.book.createMany({
        data: newBooks,
      });
    }

    // Record import
    await prisma.notionImport.create({
      data: {
        itemsImported: newBooks.length,
        status: 'success',
      },
    });

    return {
      itemsImported: newBooks.length,
      totalFound: books.length,
      skipped: books.length - newBooks.length,
    };
  } catch (error) {
    console.error('Error importing from Notion:', error);

    // Record failed import
    await prisma.notionImport.create({
      data: {
        itemsImported: 0,
        status: 'error',
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

// Helper functions to extract values from Notion properties

function extractTitle(prop: NotionPropertyValue | undefined): string | null {
  if (!prop || prop.type !== 'title') return null;
  return prop.title?.[0]?.plain_text || null;
}

function extractRichText(prop: NotionPropertyValue | undefined): string | null {
  if (!prop || prop.type !== 'rich_text') return null;
  return prop.rich_text?.[0]?.plain_text || null;
}

function extractNumber(prop: NotionPropertyValue | undefined): number | null {
  if (!prop || prop.type !== 'number') return null;
  return prop.number;
}

function extractSelect(prop: NotionPropertyValue | undefined): string | null {
  if (!prop || prop.type !== 'select') return null;
  return prop.select?.name || null;
}

function extractMultiSelect(prop: NotionPropertyValue | undefined): string[] | null {
  if (!prop || prop.type !== 'multi_select') return null;
  return prop.multi_select?.map((item: any) => item.name) || null;
}

function extractDate(prop: NotionPropertyValue | undefined): Date | null {
  if (!prop || prop.type !== 'date') return null;
  return prop.date?.start ? new Date(prop.date.start) : null;
}

// Mapping functions from Notion values to our schema

function mapNotionStatus(status: string | null): ReadingStatus {
  if (!status) return 'TO_READ';

  const map: Record<string, ReadingStatus> = {
    'To Read': 'TO_READ',
    'Reading': 'READING',
    'Next Up': 'NEXT_UP',
    'Finished': 'FINISHED',
    'Paused': 'PAUSED',
    'Wish List': 'TO_READ',
  };

  return map[status] || 'TO_READ';
}

function mapNotionMediaType(media: string[] | null): string {
  if (!media || media.length === 0) return 'PAPER';

  const mediaTypes: string[] = [];
  
  // Check for different media types in the array
  if (media.some(m => m.toLowerCase().includes('audible'))) {
    mediaTypes.push('AUDIOBOOK');
  }
  if (media.some(m => m.toLowerCase().includes('kindle'))) {
    mediaTypes.push('EBOOK');
  }
  if (media.some(m => m.toLowerCase().includes('paper') || m.toLowerCase().includes('book'))) {
    mediaTypes.push('PAPER');
  }

  // If no specific media type was found, default to PAPER
  if (mediaTypes.length === 0) {
    mediaTypes.push('PAPER');
  }

  return mediaTypes.join(',');
}

function mapNotionCategory(category: string | null): Category {
  if (!category) return 'NON_FICTION';

  const map: Record<string, Category> = {
    'Fiction': 'FICTION',
    'Non-Fiction': 'NON_FICTION',
  };

  return map[category] || 'NON_FICTION';
}

function mapNotionPriority(priority: string | null): number | null {
  if (!priority) return null;

  const map: Record<string, number> = {
    'High': 1,
    'Medium': 2,
    'Low': 3,
  };

  return map[priority] || null;
}

export async function getLastImport() {
  return await prisma.notionImport.findFirst({
    orderBy: { importedAt: 'desc' },
  });
}
