import { Manga, MangaChapter, MangaChapterImages } from '@/types/manga';
import { MangaSearchResult } from '@/types/mangaProvider';
import { BaseMangaProvider } from './BaseMangaProvider';
import { FastHttpClient } from '@/lib/fastHttp';
import { cache } from '@/lib/cache';

// Rate limiting
const RATE_LIMIT = 5; // Requests per window
const RATE_WINDOW = 1000; // 1 second
let requestQueue: number[] = [];

// Helper to handle rate limiting
const rateLimit = async () => {
  const now = Date.now();
  // Remove requests older than the window
  requestQueue = requestQueue.filter(timestamp => now - timestamp < RATE_WINDOW);
  
  // If we've hit the rate limit, wait until the oldest request falls out of the window
  if (requestQueue.length >= RATE_LIMIT) {
    const oldest = requestQueue[0];
    const waitTime = RATE_WINDOW - (now - oldest);
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  // Add current request to the queue
  requestQueue.push(Date.now());
};

type MangaDexTag = {
  id: string;
  attributes?: {
    name?: Record<string, string>;
  };
};

type MangaDexRelationshipAttributes = {
  fileName?: string;
  name?: string;
};

interface MangaDexRelationship<
  TAttributes extends MangaDexRelationshipAttributes = MangaDexRelationshipAttributes
> {
  id: string;
  type: string;
  attributes?: TAttributes;
}

interface MangaDexMangaAttributes {
  title: Record<string, string>;
  description: Record<string, string>;
  status?: string;
  year?: number;
  contentRating?: string;
  tags?: MangaDexTag[];
  updatedAt: string;
}

interface MangaDexMangaResponse {
  id: string;
  attributes: MangaDexMangaAttributes;
  relationships: MangaDexRelationship[];
}

interface MangaDexChapterAttributes {
  chapter?: string;
  title?: string;
  volume?: string;
  translatedLanguage?: string;
  pages?: number;
  publishAt?: string;
}

interface MangaDexChapterResponse {
  id: string;
  attributes: MangaDexChapterAttributes;
  relationships: MangaDexRelationship[];
}

interface MangaDexSearchResponse {
  result: string;
  response: string;
  data: MangaDexMangaResponse[];
  limit: number;
  offset: number;
  total: number;
}

interface MangaDexMangaDetailResponse {
  result: string;
  response: string;
  data: MangaDexMangaResponse;
}

interface MangaDexChapterFeedResponse {
  result: string;
  response: string;
  data: MangaDexChapterResponse[];
  limit: number;
  offset: number;
  total: number;
}

interface MangaDexChapterImagesResponse {
  result: string;
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
    dataSaver: string[];
  };
}

interface MangaDexContentRating {
  id: string;
  attributes: {
    name: string;
    description: string;
  };
}

export class MangaDexProvider extends BaseMangaProvider {
  readonly name = 'MangaDex';
  readonly baseUrl = import.meta.env.DEV 
    ? '/api/mangadex' 
    : 'https://api.mangadex.org';
  private readonly coverBaseUrl = 'https://uploads.mangadex.org/covers';
  private contentRatings: string[] = [];

  private async getContentRatings(): Promise<string[]> {
    if (this.contentRatings.length > 0) {
      return this.contentRatings;
    }

    // Include all content ratings including mature content
    this.contentRatings = [
      'safe', 'suggestive', 'erotica', 'pornographic'
    ];
    
    return this.contentRatings;
  }

  async searchManga(query: string, page: number = 1, limit: number = 24): Promise<MangaSearchResult[]> {
    const cacheKey = `mangadex:search:${query}:${page}:${limit}`;
    
    return cache.getOrSet(cacheKey, async () => {
      await rateLimit();
      
      const url = `${this.baseUrl}/manga`;
      const params = new URLSearchParams();
      params.append('title', query);
      params.append('limit', Math.min(limit, 100).toString()); // MangaDex max limit is 100
      params.append('offset', ((page - 1) * limit).toString());
      params.append('order[relevance]', 'desc');

      const contentRatings = await this.getContentRatings();
      contentRatings.forEach(rating => {
        params.append('contentRating[]', rating);
      });

      ['cover_art', 'author', 'artist'].forEach(include => {
        params.append('includes[]', include);
      });

      try {
        const response = await FastHttpClient.get<MangaDexSearchResponse>(`${url}?${params}`, {
          timeout: 10000, // 10 second timeout
          retries: 2, // Retry failed requests
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json',
          }
        });
        
        if (!response?.data) {
          return [];
        }
        
        return response.data.map(item => this.mapMangaResult(item));
      } catch (error) {
        console.error(`MangaDex search failed for "${query}":`, error);
        throw new Error(`Failed to search manga: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }, 30 * 60 * 1000); // Cache for 30 minutes
  }

  async getMangaDetails(id: string): Promise<Manga> {
    const cacheKey = `mangadex:details:${id}`;
    
    return cache.getOrSet(cacheKey, async () => {
      await rateLimit();
      
      const url = `${this.baseUrl}/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`;

      try {
        const response = await FastHttpClient.get<MangaDexMangaDetailResponse>(url, {
          timeout: 10000,
          retries: 2,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json',
          }
        });
        
        if (!response?.data) {
          throw new Error('No data returned from MangaDex');
        }
        
        return this.mapManga(response.data);
      } catch (error) {
        console.error(`Failed to fetch manga details for ID ${id}:`, error);
        throw new Error(`Failed to load manga details: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }, 60 * 60 * 1000); // Cache for 1 hour
  }

  async getChapters(
    mangaId: string, 
    page: number = 1, 
    limit: number = 100,
    options: {
      translatedLanguage?: string[];
      contentRating?: string[];
    } = {}
  ): Promise<MangaChapter[]> {
    await rateLimit();

    const offset = (page - 1) * limit;
    const contentRatings = options.contentRating || await this.getContentRatings();
    
    try {
      const url = `${this.baseUrl}/manga/${mangaId}/feed`;
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());
      params.append('order[chapter]', 'desc');
      params.append('order[volume]', 'desc');
      params.append('includeEmptyPages', '1');
      params.append('includeFuturePublishAt', '0');
      params.append('includeFutureUpdates', '1');
      params.append('includeExternalUrl', '0');

      // Handle array parameters
      const translatedLangs = options.translatedLanguage || ['en'];
      translatedLangs.forEach(lang => {
        params.append('translatedLanguage[]', lang);
      });

      contentRatings.forEach(rating => {
        params.append('contentRating[]', rating);
      });

      ['scanlation_group', 'user'].forEach(include => {
        params.append('includes[]', include);
      });

      const response = await FastHttpClient.get<MangaDexChapterFeedResponse>(`${url}?${params}`, {
        timeout: 15000,
        retries: 3,
        cacheTtl: 1000 * 60 * 15, // 15 minutes
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
        }
      });
      
      if (!response?.data) {
        throw new Error('No data received from MangaDex API');
      }
      
      return response.data.map(chapter => this.mapChapter(chapter));
    } catch (error) {
      console.error('Error fetching chapters:', error);
      throw new Error(`Failed to fetch chapters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getChapterImages(chapterId: string, quality: 'data' | 'dataSaver' = 'data'): Promise<MangaChapterImages | null> {
    await rateLimit();

    try {
      const chapterData = await FastHttpClient.get<MangaDexChapterImagesResponse>(
        `${this.baseUrl}/at-home/server/${chapterId}`,
        {
          cacheTtl: 1000 * 60 * 60, // 1 hour
          retries: 3,
          timeout: 20000, // Increased timeout for large chapters
        }
      );
      
      if (!chapterData?.chapter) {
        throw new Error('Invalid chapter data received');
      }
      
      const { baseUrl, chapter } = chapterData;
      const imageFiles = chapter[quality] || chapter.data || [];
      
      if (!imageFiles.length) {
        throw new Error('No images found for this chapter');
      }
      
      return {
        baseUrl: `${baseUrl}/${quality}/${chapter.hash}`,
        chapter: {
          hash: chapter.hash,
          data: imageFiles,
          dataSaver: chapter.dataSaver || imageFiles
        },
        // Add metadata for better debugging
        meta: {
          quality,
          totalPages: imageFiles.length,
          serverUrl: baseUrl,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error fetching chapter images:', error);
      
      // If high quality fails, try falling back to dataSaver
      if (quality === 'data') {
        console.log('Falling back to data-saver quality...');
        return this.getChapterImages(chapterId, 'dataSaver');
      }
      
      throw new Error(`Failed to load chapter images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapMangaResult(manga: MangaDexMangaResponse): MangaSearchResult {
    const coverArt = manga.relationships.find(r => r.type === 'cover_art');
    const coverFileName = coverArt?.attributes?.fileName || 'cover.jpg';

    return {
      id: manga.id,
      title: Object.values(manga.attributes.title)[0] ?? '',
      description: Object.values(manga.attributes.description)[0] ?? '',
      coverUrl: coverArt ? `${this.coverBaseUrl}/${manga.id}/${coverFileName}` : '',
      year: manga.attributes.year,
      status: manga.attributes.status,
      provider: this.name
    };
  }

  private mapManga(manga: MangaDexMangaResponse): Manga {
    const coverArt = manga.relationships.find(r => r.type === 'cover_art');
    const coverFileName = coverArt?.attributes?.fileName || 'cover.jpg';
    const author = manga.relationships.find(r => r.type === 'author')?.attributes?.name || 'Unknown';
    const artist = manga.relationships.find(r => r.type === 'artist')?.attributes?.name || 'Unknown';
    const tags = (manga.attributes.tags || []).map(tag => ({
      id: tag.id,
      name: Object.values(tag.attributes?.name || {})[0] || ''
    }));

    return {
      id: manga.id,
      title: Object.values(manga.attributes.title)[0] ?? '',
      description: Object.values(manga.attributes.description)[0] ?? '',
      coverUrl: coverArt ? `${this.coverBaseUrl}/${manga.id}/${coverFileName}` : '',
      year: manga.attributes.year,
      status: manga.attributes.status,
      contentRating: manga.attributes.contentRating,
      tags,
      author,
      artist,
      lastUpdated: manga.attributes.updatedAt,
      provider: this.name
    } as Manga;
  }

  private mapChapter(chapter: MangaDexChapterResponse): MangaChapter {
    const group = chapter.relationships.find(r => r.type === 'scanlation_group');

    return {
      id: chapter.id,
      chapter: chapter.attributes.chapter || '0',
      title: chapter.attributes.title || `Chapter ${chapter.attributes.chapter || '0'}`,
      volume: chapter.attributes.volume,
      translatedLanguage: chapter.attributes.translatedLanguage,
      pages: chapter.attributes.pages,
      publishAt: chapter.attributes.publishAt,
      scanlationGroup: group?.attributes?.name || 'Unknown',
      externalUrl: `https://mangadex.org/chapter/${chapter.id}`
    };
  }
}