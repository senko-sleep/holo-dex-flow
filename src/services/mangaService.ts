import { Manga, MangaChapter, MangaChapterImages } from '@/types/manga';
import { MangaSearchResult, MangaProvider } from '@/types/mangaProvider';
import { MangaDexProvider } from './providers/MangaDexProvider';
import { cache } from '@/lib/cache';

// Import other providers as they are implemented
// import { MangaPlusProvider } from './providers/MangaPlusProvider';
// import { ComickProvider } from './providers/ComickProvider';

class MangaService {
  private providers: MangaProvider[] = [];
  private static instance: MangaService;

  private constructor() {
    this.initializeProviders();
  }

  public static getInstance(): MangaService {
    if (!MangaService.instance) {
      MangaService.instance = new MangaService();
    }
    return MangaService.instance;
  }

  private initializeProviders() {
    // Add providers in order of preference
    this.providers = [
      new MangaDexProvider(),
      // Add more providers here
      // new MangaPlusProvider(),
      // new ComickProvider(),
    ];
  }

  async searchManga(query: string, page: number = 1, limit: number = 24): Promise<MangaSearchResult[]> {
    const cacheKey = `manga_search:${query}:${page}:${limit}`;
    
    return cache.getOrSet(cacheKey, async () => {
      const results: MangaSearchResult[] = [];
      const seenIds = new Set<string>();
      
      for (const provider of this.providers) {
        try {
          const providerResults = await provider.searchManga(query, page, limit);
          
          for (const result of providerResults) {
            const normalizedTitle = this.normalizeTitle(result.title);
            const cacheKey = `${provider.name}:${normalizedTitle}`;
            
            if (!seenIds.has(cacheKey)) {
              seenIds.add(cacheKey);
              results.push({
                ...result,
                provider: provider.name
              });
              
              if (results.length >= limit) {
                return results.slice(0, limit);
              }
            }
          }
        } catch (error) {
          console.error(`Error searching with ${provider.name}:`, error);
          continue;
        }
      }
      
      return results;
    }, 60 * 60 * 1000); // Cache for 1 hour
  }

  async getMangaDetails(provider: string, id: string): Promise<Manga | null> {
    const cacheKey = `manga_details:${provider}:${id}`;
    
    return cache.getOrSet(cacheKey, async () => {
      const providerInstance = this.providers.find(p => p.name.toLowerCase() === provider.toLowerCase());
      
      if (!providerInstance) {
        throw new Error(`Provider ${provider} not found`);
      }
      
      try {
        return await providerInstance.getMangaDetails(id);
      } catch (error) {
        console.error(`Error getting manga details from ${provider}:`, error);
        return null;
      }
    }, 24 * 60 * 60 * 1000); // Cache for 1 day
  }

  async getChapters(provider: string, mangaId: string, page: number = 1, limit: number = 100): Promise<MangaChapter[]> {
    const cacheKey = `manga_chapters:${provider}:${mangaId}:${page}:${limit}`;
    
    return cache.getOrSet(
      cacheKey,
      async () => {
        const providerInstance = this.providers.find(p => p.name.toLowerCase() === provider.toLowerCase());
        
        if (!providerInstance) {
          throw new Error(`Provider ${provider} not found`);
        }
        
        try {
          return await providerInstance.getChapters(mangaId, page, limit);
        } catch (error) {
          console.error(`Error getting chapters from ${provider}:`, error);
          throw error;
        }
      },
      24 * 60 * 60 * 1000 // Cache for 1 day
    );
  }

  async getChapterImages(provider: string, chapterId: string): Promise<MangaChapterImages | null> {
    const cacheKey = `chapter_images:${provider}:${chapterId}`;
    
    return cache.getOrSet(cacheKey, async () => {
      const providerInstance = this.providers.find(p => p.name.toLowerCase() === provider.toLowerCase());
      
      if (!providerInstance) {
        throw new Error(`Provider ${provider} not found`);
      }
      
      try {
        return await providerInstance.getChapterImages(chapterId);
      } catch (error) {
        console.error(`Error getting chapter images from ${provider}:`, error);
        return null;
      }
    }, 24 * 60 * 60 * 1000); // Cache for 1 day
  }

  async getChapterFallback(originalProvider: string, mangaId: string | number, chapterNumber: number): Promise<{ provider: string; chapter: MangaChapter | null }> {
    // Convert mangaId to string if it's a number
    const mangaIdStr = mangaId.toString();
    
    // First try to find a better quality version from other providers
    for (const provider of this.providers) {
      if (provider.name.toLowerCase() === originalProvider.toLowerCase()) continue;
      
      try {
        const chapters = await provider.getChapters(mangaIdStr, 1, 50);
        const chapter = chapters.find(c => {
          const chapNum = typeof c.chapter === 'string' ? parseFloat(c.chapter) : c.chapter;
          return !isNaN(chapNum) && Math.abs(chapNum - chapterNumber) < 0.01;
        });
        
        if (chapter) {
          return { provider: provider.name, chapter };
        }
      } catch (error) {
        console.error(`Error checking fallback chapters from ${provider.name}:`, error);
      }
    }
    
    return { provider: originalProvider, chapter: null };
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const mangaService = MangaService.getInstance();
