import { Manga, MangaChapter, MangaChapterImages } from '@/types/manga';
import { MangaSearchResult } from '@/types/mangaProvider';
import { BaseMangaProvider } from './BaseMangaProvider';
import { FastHttpClient } from '@/lib/fastHttp';

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
  data?: MangaDexMangaResponse[];
}

interface MangaDexMangaDetailResponse {
  data: MangaDexMangaResponse;
}

interface MangaDexChapterFeedResponse {
  data?: MangaDexChapterResponse[];
  total?: number;
}

interface MangaDexChapterImagesResponse {
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
  readonly baseUrl = 'https://api.mangadex.org';

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
    const offset = (page - 1) * limit;
    const contentRatings = await this.getContentRatings();
    const cacheKey = `search:${query}:${page}:${limit}`;
    
    try {
      // Prepare search parameters
      const params = {
        title: query,
        limit: limit.toString(),
        offset: offset.toString(),
        'order[relevance]': 'desc',
        'contentRating[]': contentRatings,
        'includes[]': ['cover_art'],
      };

      // Execute search
      const response = await this.http.get<MangaDexSearchResponse>('/manga', {
        params,
        cacheTtl: 1000 * 60 * 15, // 15 minutes
        retries: 2,
        timeout: 10000,
      });

      if (!response.data) return [];

      // Process results in parallel
      const results = await Promise.all(
        response.data.map(async (manga) => {
          try {
            // Check if it's a one-shot first (faster than checking chapters)
            const tags = manga.attributes.tags ?? [];
            const isOneShot = tags.some(tag => {
              const nameMap = tag.attributes?.name ?? {};
              const englishName = typeof nameMap.en === 'string'
                ? nameMap.en
                : Object.values(nameMap).find((value): value is string => typeof value === 'string');
              if (!englishName) return false;
              const normalized = englishName.toLowerCase();
              return normalized === 'one-shot' || normalized === 'oneshot' || normalized === 'one shot';
            });

            // Only check chapters if it's not a one-shot
            if (!isOneShot) {
              const feedResponse = await this.http.get<MangaDexChapterFeedResponse>(
                `/manga/${manga.id}/feed`,
                {
                  params: {
                    limit: 1,
                    offset: 0,
                    'translatedLanguage[]': ['en'],
                    'contentRating[]': contentRatings,
                  },
                  cacheTtl: 1000 * 60 * 5, // 5 minutes
                  retries: 1,
                  timeout: 5000,
                }
              );
              if (!feedResponse.data?.length) return null;
            }

            return this.mapMangaResult(manga);
          } catch (e) {
            console.error(`Error processing manga ${manga.id}:`, e);
            return null;
          }
        })
      );

      return results.filter((result): result is MangaSearchResult => result !== null);
    } catch (error) {
      console.error('MangaDex search error:', error);
      return [];
    }
  }

  async getMangaDetails(id: string): Promise<Manga | null> {
    try {
      // Fetch manga details and chapters in parallel
      const [mangaResponse, chaptersResponse] = await Promise.all([
        this.http.get<MangaDexMangaDetailResponse>(
          `/manga/${id}`,
          {
            params: {
              'includes[]': ['cover_art', 'author', 'artist'],
            },
            cacheTtl: 1000 * 60 * 30, // 30 minutes
            retries: 2,
            timeout: 10000,
          }
        ),
        this.getChapters(id, 1, 1), // Just to get total chapters count
      ]);

      const manga = mangaResponse.data;
      const coverArt = manga.relationships.find(r => r.type === 'cover_art');
      const author = manga.relationships.find(r => r.type === 'author');
      const artist = manga.relationships.find(r => r.type === 'artist');

      return {
        id: manga.id,
        title: Object.values(manga.attributes.title)[0] ?? '',
        description: Object.values(manga.attributes.description)[0] ?? '',
        coverUrl: coverArt?.attributes?.fileName
          ? `${this.coverBaseUrl}/${manga.id}/${coverArt.attributes.fileName}`
          : '',
        status: manga.attributes.status,
        year: manga.attributes.year,
        contentRating: manga.attributes.contentRating,
        author: author?.attributes?.name,
        artist: artist?.attributes?.name,
        tags: (manga.attributes.tags ?? []).map(tag => ({
          id: tag.id,
          name: tag.attributes?.name?.en ?? ''
        })) || [],
        chapters: chaptersResponse.length,
        lastUpdated: new Date(manga.attributes.updatedAt).toISOString()
      };
    } catch (error) {
      console.error('Error fetching manga details:', error);
      return null;
    }
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
    const offset = (page - 1) * limit;
    const contentRatings = options.contentRating || await this.getContentRatings();
    
    try {
      const response = await this.http.get<MangaDexChapterFeedResponse>(
        `/manga/${mangaId}/feed`,
        {
          params: {
            limit: limit.toString(),
            offset: offset.toString(),
            'translatedLanguage[]': options.translatedLanguage || ['en'],
            'contentRating[]': contentRatings,
            'order[chapter]': 'desc',
            'order[volume]': 'desc',
            'includes[]': ['scanlation_group', 'user'],
            'includeEmptyPages': '1',
            'includeFuturePublishAt': '0',
            'includeFutureUpdates': '1',
            'includeExternalUrl': '0'
          },
          cacheTtl: 1000 * 60 * 15, // 15 minutes
          retries: 3,
          timeout: 15000,
        }
      );
      
      if (!response.data) {
        throw new Error('No data received from MangaDex API');
      }
      
      return response.data.map(chapter => this.mapChapter(chapter));
    } catch (error) {
      console.error('Error fetching chapters:', error);
      throw new Error(`Failed to fetch chapters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getChapterImages(chapterId: string, quality: 'data' | 'dataSaver' = 'data'): Promise<MangaChapterImages | null> {
    try {
      const chapterData = await this.http.get<MangaDexChapterImagesResponse>(
        `/at-home/server/${chapterId}`,
        {
          cacheTtl: 1000 * 60 * 60, // 1 hour
          retries: 3,
          timeout: 20000, // Increased timeout for large chapters
        }
      );
      
      if (!chapterData || !chapterData.chapter) {
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
