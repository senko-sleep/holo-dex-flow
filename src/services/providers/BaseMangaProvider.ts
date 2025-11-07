import { Manga, MangaChapter, MangaChapterImages } from '@/types/manga';
import { MangaProvider as IMangaProvider, MangaSearchResult } from '@/types/mangaProvider';
import { FastHttpClient } from '@/lib/fastHttp';
import { cache } from '@/lib/cache';

export abstract class BaseMangaProvider implements IMangaProvider {
  abstract readonly name: string;
  abstract readonly baseUrl: string;
  
  protected _http: FastHttpClient | null = null;
  protected defaultHeaders: Record<string, string> = {};
  protected cacheTtl = 1000 * 60 * 15; // 15 minutes by default

  protected get http(): FastHttpClient {
    if (!this._http) {
      this._http = new FastHttpClient(this.baseUrl, this.defaultHeaders);
    }
    return this._http;
  }

  // Abstract methods that must be implemented by each provider
  abstract searchManga(query: string, page?: number, limit?: number): Promise<MangaSearchResult[]>;
  abstract getMangaDetails(id: string): Promise<Manga | null>;
  abstract getChapters(mangaId: string, page?: number, limit?: number): Promise<MangaChapter[]>;
  abstract getChapterImages(chapterId: string): Promise<MangaChapterImages | null>;

  // Optional methods with default implementations
  async getPopularManga(page: number = 1, limit: number = 24): Promise<MangaSearchResult[]> {
    return [];
  }

  async getMangaByUrl(url: string): Promise<Manga | null> {
    return null;
  }

  // Batch multiple requests for parallel execution
  protected async batch<T>(requests: Array<() => Promise<T>>): Promise<T[]> {
    return this.http.batch(requests);
  }

  // Clear cache for this provider
  clearCache(prefix: string = ''): void {
    this.http.clearCache(prefix);
  }

  protected normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
