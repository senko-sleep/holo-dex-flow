import { BaseMangaProvider } from './BaseMangaProvider';
import { Manga, MangaChapter, MangaChapterImages, MangaTag } from '@/types/manga';
import { MangaSearchResult } from '@/types/mangaProvider';

export class MangaPlusProvider extends BaseMangaProvider {
  readonly name = 'MangaPlus';
  readonly baseUrl = 'https://jumpg-webapi.tokyo-cdn.com/api';
  private readonly apiUrl = 'https://jumpg-webapi.tokyo-cdn.com/api';
  private readonly webUrl = 'https://mangaplus.shueisha.co.jp';
  
  constructor() {
    super();
    // Initialize default headers from base class
    this.defaultHeaders = {
      ...this.defaultHeaders, // Keep any base headers
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Origin': 'https://mangaplus.shueisha.co.jp',
      'Referer': 'https://mangaplus.shueisha.co.jp/'
    };
  }

  async searchManga(query: string, page: number = 1, limit: number = 24): Promise<MangaSearchResult[]> {
    try {
      const response = await this.http.get<MangaPlusTitleListResponse>(
        `${this.apiUrl}/title_list/all`,
        { headers: this.defaultHeaders }
      );
      
      const results = response.titleList
        .filter(title => 
          title.name.toLowerCase().includes(query.toLowerCase()) ||
          (title.author && title.author.toLowerCase().includes(query.toLowerCase()))
        )
        .slice((page - 1) * limit, page * limit)
        .map(title => this.mapToSearchResult(title));
      
      return results;
    } catch (error) {
      console.error('MangaPlus search error:', error);
      return [];
    }
  }

  async getMangaDetails(id: string): Promise<Manga | null> {
    try {
      const response = await this.http.get<MangaPlusTitleDetailResponse>(
        `${this.apiUrl}/title_detail?title_id=${id}`,
        { headers: this.defaultHeaders }
      );
      return this.mapToManga(response.titleDetail);
    } catch (error) {
      console.error('MangaPlus getMangaDetails error:', error);
      return null;
    }
  }

  async getChapters(mangaId: string, page: number = 1, limit: number = 100): Promise<MangaChapter[]> {
    try {
      const response = await this.http.get<MangaPlusTitleDetailResponse>(
        `${this.apiUrl}/title_detail?title_id=${mangaId}`,
        { headers: this.defaultHeaders }
      );
      
      return response.titleDetail.chapterList
        .sort((a, b) => b.chapterId - a.chapterId)
        .slice((page - 1) * limit, page * limit)
        .map(chap => this.mapToChapter(chap, mangaId));
    } catch (error) {
      console.error('MangaPlus getChapters error:', error);
      return [];
    }
  }

  async getChapterImages(chapterId: string): Promise<MangaChapterImages | null> {
    try {
      const response = await this.http.get<MangaPlusChapterResponse>(
        `${this.apiUrl}/manga_viewer?chapter_id=${chapterId}`,
        { 
          headers: this.defaultHeaders,
          cacheTtl: 1000 * 60 * 60 * 24 // Cache for 24 hours
        }
      );
      
      const pages = response.mangaViewer.pages
        .filter(page => page.mangaPage)
        .map(page => page.mangaPage.imageUrl);
      
      if (pages.length === 0) {
        throw new Error('No pages found in chapter');
      }
      
      return {
        baseUrl: '',
        chapter: {
          hash: chapterId,
          data: pages,
          dataSaver: pages
        }
      };
    } catch (error) {
      console.error('MangaPlus getChapterImages error:', error);
      return null;
    }
  }

  private mapToSearchResult(title: MangaPlusTitle): MangaSearchResult {
    return {
      id: title.titleId.toString(),
      title: title.name,
      description: title.overview || '',
      coverUrl: title.portraitImageUrl || title.landscapeImageUrl || '',
      year: title.startYear,
      provider: this.name
    };
  }

  private mapToManga(detail: MangaPlusTitleDetail): Manga {
    return {
      id: detail.titleId.toString(),
      title: detail.titleName,
      description: detail.synopsis || '',
      coverUrl: detail.portraitImageUrl || detail.landscapeImageUrl || '',
      status: this.mapStatus(detail.status),
      year: detail.startYear,
      author: detail.author,
      artist: detail.artist,
      tags: this.mapTags(detail.genres),
      provider: this.name
    } as Manga;
  }

  private mapToChapter(chapter: MangaPlusChapter, mangaId: string): MangaChapter {
    return {
      id: chapter.chapterId.toString(),
      chapter: chapter.chapterName || `Chapter ${chapter.chapterSubTitle}`,
      title: chapter.chapterTitle || '',
      translatedLanguage: 'en',
      pages: chapter.pageCount,
      publishAt: chapter.startTimeStamp * 1000,
      externalUrl: `${this.webUrl}/titles/${mangaId}/${chapter.chapterId}`
    };
  }

  private mapStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'ACTIVE': 'Ongoing',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled',
      'HIATUS': 'Hiatus'
    };
    return statusMap[status] || status;
  }

  private mapTags(genres: string[]): MangaTag[] {
    return genres.map(genre => ({
      id: genre.toLowerCase().replace(/\s+/g, '-'),
      name: genre,
      type: 'genre'
    }));
  }
}

// Type definitions for MangaPlus API responses
interface MangaPlusTitleListResponse {
  titleList: MangaPlusTitle[];
}

interface MangaPlusTitle {
  titleId: number;
  name: string;
  author: string;
  portraitImageUrl: string;
  landscapeImageUrl: string;
  startYear: number;
  overview?: string;
}

interface MangaPlusTitleDetailResponse {
  titleDetail: MangaPlusTitleDetail;
}

interface MangaPlusTitleDetail {
  titleId: number;
  titleName: string;
  author: string;
  artist: string;
  portraitImageUrl: string;
  landscapeImageUrl: string;
  startYear: number;
  status: string;
  synopsis: string;
  genres: string[];
  chapterList: MangaPlusChapter[];
}

interface MangaPlusChapter {
  chapterId: number;
  chapterName: string;
  chapterSubTitle: string;
  chapterTitle: string;
  pageCount: number;
  startTimeStamp: number;
}

interface MangaPlusChapterResponse {
  mangaViewer: {
    pages: Array<{
      mangaPage: {
        imageUrl: string;
      } | null;
    }>;
  };
}
