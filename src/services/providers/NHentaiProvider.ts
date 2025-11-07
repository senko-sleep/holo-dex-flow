import { Manga, MangaChapter, MangaChapterImages } from '@/types/manga';
import { MangaSearchResult } from '@/types/mangaProvider';
import { BaseMangaProvider } from './BaseMangaProvider';
import { FastHttpClient } from '@/lib/fastHttp';

interface NHentaiGalleryImage {
  t: 'j' | 'p' | 'g'; // jpg, png, gif
  w: number;
  h: number;
}

interface NHentaiGalleryTag {
  id: number;
  type: 'tag' | 'category' | 'artist' | 'group' | 'parody' | 'character' | 'language';
  name: string;
  url: string;
  count: number;
}

interface NHentaiGallery {
  id: number;
  media_id: string;
  title: {
    english: string;
    japanese: string;
    pretty: string;
  };
  images: {
    pages: NHentaiGalleryImage[];
    cover: NHentaiGalleryImage;
    thumbnail: NHentaiGalleryImage;
  };
  scanlator: string;
  upload_date: number;
  tags: NHentaiGalleryTag[];
  num_pages: number;
  num_favorites: number;
}

interface NHentaiSearchResponse {
  result: NHentaiGallery[];
  num_pages: number;
  per_page: number;
}

export class NHentaiProvider extends BaseMangaProvider {
  readonly name = 'nHentai';
  readonly baseUrl = 'https://nhentai.net';
  private readonly apiUrl = 'https://nhentai.net/api';
  private readonly imageUrl = 'https://i.nhentai.net';
  
  constructor() {
    super();
    this.defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Referer': 'https://nhentai.net/'
    };
  }
  private readonly thumbUrl = 'https://t.nhentai.net';

  async searchManga(query: string, page: number = 1, limit: number = 24): Promise<MangaSearchResult[]> {
    try {
      const response = await this.http.get<NHentaiSearchResponse>(
        `${this.apiUrl}/galleries/search`,
        {
          params: {
            query,
            page: page.toString(),
            sort: 'popular',
            language: 'english'
          },
          cacheTtl: 1000 * 60 * 15, // 15 minutes
          retries: 2,
          timeout: 10000,
        }
      );

      return response.result.map(gallery => this.mapGalleryToSearchResult(gallery));
    } catch (error) {
      console.error('Error searching nHentai:', error);
      return [];
    }
  }

  async getMangaDetails(id: string): Promise<Manga | null> {
    try {
      const gallery = await this.http.get<NHentaiGallery>(
        `${this.apiUrl}/gallery/${id}`,
        {
          cacheTtl: 1000 * 60 * 60, // 1 hour
          retries: 3,
          timeout: 15000,
        }
      );

      return this.mapGalleryToManga(gallery);
    } catch (error) {
      console.error('Error fetching nHentai gallery:', error);
      return null;
    }
  }

  async getChapters(mangaId: string, page: number = 1, limit: number = 100): Promise<MangaChapter[]> {
    // nHentai doesn't have chapters, so we return a single "chapter" for the entire gallery
    const gallery = await this.getMangaDetails(mangaId);
    if (!gallery) return [];

    return [{
      id: mangaId,
      title: 'Read',
      chapter: 1,
      pages: gallery.pages || 0,
      volume: 1,
      translatedLanguage: 'en',
      language: 'en',
      timestamp: new Date().getTime()
    }];
  }

  async getChapterImages(chapterId: string): Promise<MangaChapterImages | null> {
    try {
      const gallery = await this.getMangaDetails(chapterId);
      if (!gallery) return null;

      // nHentai uses a simple pattern for image URLs
      const imageUrls = Array.from({ length: gallery.pages || 0 }, (_, i) => {
        const pageNum = i + 1;
        return `https://i.nhentai.net/galleries/${gallery.id}/${pageNum}.jpg`;
      });

      return {
        baseUrl: '',
        chapter: {
          hash: '',
          data: imageUrls,
          dataSaver: imageUrls // Same URLs for both quality modes
        },
        meta: {
          quality: 'data',
          totalPages: imageUrls.length,
          serverUrl: this.imageUrl,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error fetching nHentai chapter images:', error);
      throw new Error(`Failed to load chapter images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapGalleryToSearchResult(gallery: NHentaiGallery): MangaSearchResult {
    return {
      id: gallery.id.toString(),
      title: gallery.title.english || gallery.title.japanese || gallery.title.pretty || 'Untitled',
      coverUrl: this.getThumbnailUrl(gallery.media_id, 'cover'),
      year: new Date(gallery.upload_date * 1000).getFullYear(),
      provider: this.name,
      description: ''
    };
  }

  private mapGalleryToManga(gallery: NHentaiGallery): Manga {
    const tags = gallery.tags || [];
    const artists = tags.filter(t => t.type === 'artist').map(t => t.name);
    const categories = tags.filter(t => t.type === 'category').map(t => t.name);
    const parodies = tags.filter(t => t.type === 'parody').map(t => t.name);

    return {
      id: gallery.id.toString(),
      title: gallery.title.english || gallery.title.japanese || gallery.title.pretty || 'Untitled',
      description: '',
      coverUrl: this.getThumbnailUrl(gallery.media_id, 'cover'),
      bannerUrl: this.getThumbnailUrl(gallery.media_id, 'banner'),
      status: 'completed',
      year: new Date(gallery.upload_date * 1000).getFullYear(),
      contentRating: this.getContentRating(categories),
      author: artists.join(', '),
      tags: tags.map(tag => ({
        id: tag.id.toString(),
        name: tag.name,
        type: tag.type
      })),
      chapters: 1,
      pages: gallery.num_pages,
      favorites: gallery.num_favorites,
      lastUpdated: new Date(gallery.upload_date * 1000).toISOString()
    };
  }

  private getThumbnailUrl(mediaId: string, type: 'cover' | 'thumb' | 'banner' = 'cover'): string {
    switch (type) {
      case 'cover':
        return `https://t.nhentai.net/galleries/${mediaId}/cover.jpg`;
      case 'thumb':
        return `https://t.nhentai.net/galleries/${mediaId}/thumb.jpg`;
      case 'banner':
        return `https://t.nhentai.net/galleries/${mediaId}/1t.jpg`;
      default:
        return '';
    }
  }

  private getContentRating(categories: string[]): string {
    if (categories.includes('lolicon') || categories.includes('shotacon')) {
      return 'questionable';
    }
    return 'nsfw';
  }

}

export default NHentaiProvider;
