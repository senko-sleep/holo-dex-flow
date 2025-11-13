import { Manga, MangaChapter, MangaChapterImages } from '@/types/manga';
import { cache } from '@/lib/cache';

const MANGADEX_BASE_URL = 'https://api.mangadex.org';

// MangaDex API credentials
const MANGADEX_CLIENT_ID = 'personal-client-46011b3e-6848-45a0-9b09-b62429c5d6bf-cc5ab956';

// Rate limiting helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry helper with exponential backoff
const retryFetch = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await delay(delayMs);
    return retryFetch(fn, retries - 1, delayMs * 2);
  }
};

interface MangaResponse {
  id: string;
  attributes: {
    title: Record<string, string>;
    description: Record<string, string>;
    status: string;
    year: number | null;
    contentRating: string;
    tags: TagResponse[];
  };
  relationships: RelationshipResponse[];
}

interface ChapterResponse {
  id: string;
  attributes: {
    volume: string | null;
    chapter: string | null;
    title: string | null;
    translatedLanguage: string;
    pages: number;
    publishAt: string;
  };
  relationships: RelationshipResponse[];
}

interface TagResponse {
  id: string;
  attributes: {
    name: Record<string, string>;
    group: string;
  };
}

interface RelationshipResponse {
  id: string;
  type: string;
  attributes?: {
    name?: string;
    fileName?: string;
  };
}

interface AtHomeServerResponse {
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
    dataSaver: string[];
  };
}

// MangaDex content ratings
export const MANGA_CONTENT_RATINGS = [
  { value: 'safe', label: 'Safe' },
  { value: 'suggestive', label: 'Suggestive' },
  { value: 'erotica', label: 'Erotica' },
  { value: 'pornographic', label: 'Pornographic' },
  { value: 'hentai', label: 'Hentai' }
];

// MangaDex status options
export const MANGA_STATUS_OPTIONS = [
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'hiatus', label: 'Hiatus' },
  { value: 'cancelled', label: 'Cancelled' },
];

// MangaDex demographic options
export const MANGA_DEMOGRAPHIC_OPTIONS = [
  { value: 'shounen', label: 'Shounen' },
  { value: 'shoujo', label: 'Shoujo' },
  { value: 'seinen', label: 'Seinen' },
  { value: 'josei', label: 'Josei' },
  { value: 'none', label: 'None' },
];

export interface MangaFilters {
  includedTags?: string[];
  excludedTags?: string[];
  status?: string[];
  publicationDemographic?: string[];
  contentRating?: string[];
  order?: {
    [key: string]: 'asc' | 'desc';
  };
}

export const mangadexApi = {
  // Search manga with filters
  async searchManga(query: string, filters?: MangaFilters, limit = 20, offset = 0): Promise<Manga[]> {
    const cacheKey = `search_manga_${query}_${JSON.stringify(filters)}_${limit}_${offset}`;
    const cached = cache.get<Manga[]>(cacheKey);
    if (cached) return cached;

    try {
      const result = await retryFetch(async () => {
        await delay(250);

        const params = new URLSearchParams();
        params.append('title', query);
        params.append('limit', limit.toString());
        params.append('offset', offset.toString());

        // Add includes
        ['cover_art', 'author', 'artist'].forEach(include => {
          params.append('includes[]', include);
        });

        // Add content ratings - include safe content by default, and only one explicit rating if specified
        const defaultContentRatings = ['safe', 'suggestive', 'erotica'];
        const explicitRatings = filters?.contentRating?.filter(r => ['pornographic', 'hentai'].includes(r)) || [];
        
        // Use the first explicit rating if specified, or default to safe content
        const contentRatings = explicitRatings.length > 0 
          ? [...defaultContentRatings, explicitRatings[0]]
          : defaultContentRatings;
          
        contentRatings.forEach(rating => {
          params.append('contentRating[]', rating);
        });

        // Add authentication header if available
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        
        if (MANGADEX_CLIENT_ID) {
          headers['Authorization'] = `Bearer ${MANGADEX_CLIENT_ID}`;
        }

        // Add filters
        if (filters?.includedTags) {
          filters.includedTags.forEach(tag => params.append('includedTags[]', tag));
        }
        if (filters?.excludedTags) {
          filters.excludedTags.forEach(tag => params.append('excludedTags[]', tag));
        }
        if (filters?.status) {
          filters.status.forEach(status => params.append('status[]', status));
        }
        if (filters?.publicationDemographic) {
          filters.publicationDemographic.forEach(demo => params.append('publicationDemographic[]', demo));
        }
        if (filters?.order) {
          Object.entries(filters.order).forEach(([key, value]) => {
            params.append(`order[${key}]`, value);
          });
        }

        const response = await fetch(`${MANGADEX_BASE_URL}/manga?${params.toString()}`, {
          headers: headers,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return this.processMangaData(data.data || []);
      });

      cache.set(cacheKey, result, 5 * 60 * 1000); // Cache for 5 minutes
      return result;
    } catch (error) {
      console.error('Error searching manga:', error);
      return [];
    }
  },

  // Get manga by ID
  async getMangaById(id: string): Promise<Manga | null> {
    const cacheKey = `manga_${id}`;
    const cached = cache.get<Manga>(cacheKey);
    if (cached) return cached;

    try {
      const result = await retryFetch(async () => {
        await delay(250);
        const response = await fetch(`${MANGADEX_BASE_URL}/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MANGADEX_CLIENT_ID}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const processed = this.processMangaData([data.data]);
        return processed[0] || null;
      });

      if (result) {
        cache.set(cacheKey, result, 15 * 60 * 1000); // Cache for 15 minutes
      }
      return result;
    } catch (error) {
      console.error('Error fetching manga:', error);
      return null;
    }
  },

  // Get manga chapters
  async getMangaChapters(mangaId: string, limit = 100, offset = 0, translatedLanguage = ['en']): Promise<MangaChapter[]> {
    const cacheKey = `chapters_${mangaId}_${limit}_${offset}_${translatedLanguage.join('_')}`;
    const cached = cache.get<MangaChapter[]>(cacheKey);
    if (cached) return cached;

    try {
      const result = await retryFetch(async () => {
        await delay(250);

        const params = new URLSearchParams();
        params.append('manga', mangaId);
        params.append('limit', limit.toString());
        params.append('offset', offset.toString());
        translatedLanguage.forEach(lang => params.append('translatedLanguage[]', lang));
        params.append('order[chapter]', 'asc');
        params.append('includes[]', 'scanlation_group');

        const response = await fetch(`${MANGADEX_BASE_URL}/chapter?${params}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MANGADEX_CLIENT_ID}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return this.processChapterData(data.data || []);
      });

      cache.set(cacheKey, result, 10 * 60 * 1000); // Cache for 10 minutes
      return result;
    } catch (error) {
      console.error('Error fetching chapters:', error);
      return [];
    }
  },

  // Get chapter images
  async getChapterImages(chapterId: string): Promise<MangaChapterImages | null> {
    try {
      const result = await retryFetch(async () => {
        await delay(250);
        const response = await fetch(`${MANGADEX_BASE_URL}/at-home/server/${chapterId}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MANGADEX_CLIENT_ID}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: AtHomeServerResponse = await response.json();
        return {
          baseUrl: data.baseUrl,
          chapter: {
            hash: data.chapter.hash,
            data: data.chapter.data,
            dataSaver: data.chapter.dataSaver,
          },
        };
      });
      return result;
    } catch (error) {
      console.error('Error fetching chapter images:', error);
      return null;
    }
  },

  // Get available content ratings
  async getContentRatings(): Promise<Array<{ value: string; label: string }>> {
    // Return the predefined content ratings
    return MANGA_CONTENT_RATINGS;
  },

  // Get available status options
  async getStatusOptions(): Promise<Array<{ value: string; label: string }>> {
    return MANGA_STATUS_OPTIONS;
  },

  // Get available demographic options
  async getDemographicOptions(): Promise<Array<{ value: string; label: string }>> {
    return MANGA_DEMOGRAPHIC_OPTIONS;
  },

  // Get available tags for filtering
  async getTags(): Promise<Array<{ id: string; name: string; group: string }>> {
    try {
      const response = await fetch(`${MANGADEX_BASE_URL}/manga/tag`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MANGADEX_CLIENT_ID}`
        }
      });

      if (!response.ok) return [];

      const data = await response.json();
      return (data.data || []).map((tag: TagResponse) => ({
        id: tag.id,
        name: tag.attributes.name.en,
        group: tag.attributes.group,
      }));
    } catch (error) {
      console.error('Error fetching tags:', error);
      return [];
    }
  },

  // Process manga data helper
  processMangaData(data: MangaResponse[]): Manga[] {
    return data.map((manga: MangaResponse) => {
      const coverArt = manga.relationships?.find((rel: RelationshipResponse) => rel.type === 'cover_art');
      const author = manga.relationships?.find((rel: RelationshipResponse) => rel.type === 'author');
      const artist = manga.relationships?.find((rel: RelationshipResponse) => rel.type === 'artist');

      const coverFileName = coverArt?.attributes?.fileName;
      const coverUrl = coverFileName
        ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.256.jpg`
        : '/placeholder.svg';

      return {
        id: manga.id,
        title: manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Unknown',
        description: manga.attributes.description?.en || '',
        coverUrl,
        status: manga.attributes.status,
        year: manga.attributes.year,
        contentRating: manga.attributes.contentRating,
        tags: manga.attributes.tags?.map((tag: TagResponse) => ({
          id: tag.id,
          name: tag.attributes.name.en,
        })) || [],
        author: author?.attributes?.name || 'Unknown',
        artist: artist?.attributes?.name || 'Unknown',
      };
    });
  },

  // Process chapter data helper
  processChapterData(data: ChapterResponse[]): MangaChapter[] {
    return data.map((chapter: ChapterResponse) => {
      const scanlationGroup = chapter.relationships?.find((rel: RelationshipResponse) => rel.type === 'scanlation_group');

      return {
        id: chapter.id,
        chapter: chapter.attributes.chapter || '0',
        title: chapter.attributes.title || '',
        volume: chapter.attributes.volume,
        translatedLanguage: chapter.attributes.translatedLanguage,
        pages: chapter.attributes.pages,
        publishAt: chapter.attributes.publishAt,
        scanlationGroup: scanlationGroup?.attributes?.name || 'Unknown',
      };
    });
  },
};