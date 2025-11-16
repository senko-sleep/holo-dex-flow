import { Manga, MangaChapter, MangaChapterImages } from '@/types/manga';
import { cache } from '@/lib/cache';
import { localStorageManager } from '@/lib/localStorage';
import { fetchMangaDex } from '@/lib/corsProxy';

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
    const storageKey = `search_manga_${query}_${JSON.stringify(filters)}_${limit}_${offset}`;
    
    try {
      // Use localStorage with 24-hour TTL and fallback to API
      return await localStorageManager.getOrFetch(
        storageKey,
        async () => {
          await delay(250);

          const params = new URLSearchParams();
          params.append('title', query);
          params.append('limit', limit.toString());
          params.append('offset', offset.toString());

          // Add includes
          ['cover_art', 'author', 'artist'].forEach(include => {
            params.append('includes[]', include);
          });

          // Add content ratings
          const defaultContentRatings = ['safe', 'suggestive', 'erotica'];
          const explicitRatings = filters?.contentRating?.filter(r => ['pornographic', 'hentai'].includes(r)) || [];
          const contentRatings = explicitRatings.length > 0 
            ? [...defaultContentRatings, explicitRatings[0]]
            : defaultContentRatings;
            
          contentRatings.forEach(rating => {
            params.append('contentRating[]', rating);
          });

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

          // Use CORS proxy for MangaDex
          const data = await fetchMangaDex<{ data: MangaResponse[] }>(
            `/manga?${params.toString()}`,
            {
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${MANGADEX_CLIENT_ID}`
              }
            }
          );

          return this.processMangaData(data.data || []);
        },
        24 * 60 * 60 * 1000 // 24 hours in localStorage
      );
    } catch (error) {
      console.error('Error searching manga:', error);
      
      // Try to return stale data from localStorage if available
      const staleData = localStorageManager.get<Manga[]>(storageKey);
      if (staleData) {
        console.warn('Returning stale data from localStorage');
        return staleData;
      }
      
      return [];
    }
  },

  // Get manga by ID
  async getMangaById(id: string): Promise<Manga | null> {
    const storageKey = `manga_${id}`;
    
    try {
      return await localStorageManager.getOrFetch(
        storageKey,
        async () => {
          await delay(250);
          
          const data = await fetchMangaDex<{ data: MangaResponse }>(
            `/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MANGADEX_CLIENT_ID}`
              }
            }
          );

          const processed = this.processMangaData([data.data]);
          return processed[0] || null;
        },
        24 * 60 * 60 * 1000 // 24 hours
      );
    } catch (error) {
      console.error('Error fetching manga:', error);
      const staleData = localStorageManager.get<Manga>(storageKey);
      return staleData || null;
    }
  },

  // Get manga chapters
  async getMangaChapters(mangaId: string, limit = 100, offset = 0, translatedLanguage = ['en']): Promise<MangaChapter[]> {
    const storageKey = `chapters_${mangaId}_${limit}_${offset}_${translatedLanguage.join('_')}`;
    
    try {
      return await localStorageManager.getOrFetch(
        storageKey,
        async () => {
          await delay(250);

          const params = new URLSearchParams();
          params.append('manga', mangaId);
          params.append('limit', limit.toString());
          params.append('offset', offset.toString());
          translatedLanguage.forEach(lang => params.append('translatedLanguage[]', lang));
          params.append('order[chapter]', 'asc');
          params.append('includes[]', 'scanlation_group');

          const data = await fetchMangaDex<{ data: ChapterResponse[] }>(
            `/chapter?${params}`,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MANGADEX_CLIENT_ID}`
              }
            }
          );

          return this.processChapterData(data.data || []);
        },
        12 * 60 * 60 * 1000 // 12 hours
      );
    } catch (error) {
      console.error('Error fetching chapters:', error);
      const staleData = localStorageManager.get<MangaChapter[]>(storageKey);
      return staleData || [];
    }
  },

  // Get chapter images
  async getChapterImages(chapterId: string): Promise<MangaChapterImages | null> {
    const storageKey = `chapter_images_${chapterId}`;
    
    try {
      return await localStorageManager.getOrFetch(
        storageKey,
        async () => {
          await delay(250);
          
          const data = await fetchMangaDex<AtHomeServerResponse>(
            `/at-home/server/${chapterId}`,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MANGADEX_CLIENT_ID}`
              }
            }
          );

          return {
            baseUrl: data.baseUrl,
            chapter: {
              hash: data.chapter.hash,
              data: data.chapter.data,
              dataSaver: data.chapter.dataSaver,
            },
          };
        },
        6 * 60 * 60 * 1000 // 6 hours
      );
    } catch (error) {
      console.error('Error fetching chapter images:', error);
      const staleData = localStorageManager.get<MangaChapterImages>(storageKey);
      return staleData || null;
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
    const storageKey = 'manga_tags';
    
    try {
      return await localStorageManager.getOrFetch(
        storageKey,
        async () => {
          const data = await fetchMangaDex<{ data: TagResponse[] }>(
            '/manga/tag',
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MANGADEX_CLIENT_ID}`
              }
            }
          );

          return (data.data || []).map((tag: TagResponse) => ({
            id: tag.id,
            name: tag.attributes.name.en,
            group: tag.attributes.group,
          }));
        },
        7 * 24 * 60 * 60 * 1000 // 7 days (tags rarely change)
      );
    } catch (error) {
      console.error('Error fetching tags:', error);
      const staleData = localStorageManager.get<Array<{ id: string; name: string; group: string }>>(storageKey);
      return staleData || [];
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
        ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.512.jpg`
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