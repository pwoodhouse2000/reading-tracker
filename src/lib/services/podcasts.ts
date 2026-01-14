/**
 * Podcast search service using ListenNotes API
 * https://www.listennotes.com/api/docs/
 * 
 * Free tier: 300 requests/month
 */

const LISTENNOTES_API_KEY = process.env.LISTENNOTES_API_KEY;
const LISTENNOTES_BASE_URL = 'https://listen-api.listennotes.com/api/v2';

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  podcastTitle: string;
  podcastImage: string;
  audioUrl: string;
  listennotesUrl: string;
  publishDate: string;
  durationSeconds: number;
}

interface ListenNotesSearchResult {
  results: Array<{
    id: string;
    title_original: string;
    description_original: string;
    podcast: {
      id: string;
      title_original: string;
      image: string;
      listennotes_url: string;
    };
    audio: string;
    listennotes_url: string;
    pub_date_ms: number;
    audio_length_sec: number;
  }>;
  total: number;
  count: number;
  next_offset: number;
}

/**
 * Search for podcast episodes featuring a specific person (author, guest, etc.)
 */
export async function searchPodcastEpisodes(
  personName: string,
  limit = 10
): Promise<{ episodes: PodcastEpisode[]; total: number } | null> {
  if (!LISTENNOTES_API_KEY) {
    console.log('ListenNotes API key not configured');
    return null;
  }

  try {
    // Search for episodes where this person is mentioned (likely as a guest or topic)
    const query = encodeURIComponent(`"${personName}" interview OR guest`);
    
    const response = await fetch(
      `${LISTENNOTES_BASE_URL}/search?q=${query}&type=episode&len_min=10&language=English&safe_mode=1&offset=0&sort_by_date=0`,
      {
        headers: {
          'X-ListenAPI-Key': LISTENNOTES_API_KEY,
        },
        next: { revalidate: 86400 }, // Cache for 24 hours
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ListenNotes API error:', response.status, errorText);
      return null;
    }

    const data: ListenNotesSearchResult = await response.json();

    const episodes: PodcastEpisode[] = data.results.slice(0, limit).map((result) => ({
      id: result.id,
      title: result.title_original,
      description: stripHtml(result.description_original).slice(0, 300),
      podcastTitle: result.podcast.title_original,
      podcastImage: result.podcast.image,
      audioUrl: result.audio,
      listennotesUrl: result.listennotes_url,
      publishDate: new Date(result.pub_date_ms).toISOString(),
      durationSeconds: result.audio_length_sec,
    }));

    return {
      episodes,
      total: data.total,
    };
  } catch (error) {
    console.error('Error searching podcasts:', error);
    return null;
  }
}

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

/**
 * Check if ListenNotes API is configured
 */
export function isPodcastSearchEnabled(): boolean {
  return !!LISTENNOTES_API_KEY;
}
