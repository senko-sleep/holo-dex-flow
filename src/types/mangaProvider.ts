import { Manga, MangaChapter, MangaChapterImages } from './manga';

export interface MangaSearchResult {
  id: string;
  title: string;
  coverUrl: string;
  description?: string;
  year?: number;
  status?: string;
  provider: string;
}

export interface MangaProvider {
  readonly name: string;
  
  searchManga(query: string, page?: number, limit?: number): Promise<MangaSearchResult[]>;
  getMangaDetails(id: string): Promise<Manga | null>;
  getChapters(mangaId: string, page?: number, limit?: number): Promise<MangaChapter[]>;
  getChapterImages(chapterId: string): Promise<MangaChapterImages | null>;
  
  // Optional: Get manga by URL
  getMangaByUrl?(url: string): Promise<Manga | null>;
  
  // Optional: Get popular/top manga
  getPopularManga?(page?: number, limit?: number): Promise<MangaSearchResult[]>;
}
