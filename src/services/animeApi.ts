import { Anime, AnimeCharacter, ThemeSong } from '@/types/anime';
import { Character } from '@/types/manga';
import { cache } from '@/lib/cache';
import { anilistApi } from './anilistApi';
import { jikanApi } from './jikanApi';
import { toast } from '@/components/ui/use-toast';
import { APIError, RateLimitError, APIResponseError } from '../types/error';

// Helper to merge and deduplicate anime results
const mergeAnimeResults = (animeList: Anime[]): Anime[] => {
  const seen = new Set<number>();
  return animeList.reduce<Anime[]>((acc, anime) => {
    if (!seen.has(anime.mal_id)) {
      seen.add(anime.mal_id);
      acc.push(anime);
    }
    return acc;
  }, []);
};

// Convert string tags to numbers for AniList API compatibility
const convertTagsToNumbers = (tags?: string[]): number[] | undefined => {
  if (!tags) return undefined;
  return tags.map(tag => {
    const num = Number(tag);
    return isNaN(num) ? 0 : num; // Fallback to 0 if conversion fails
  });
};

const ANIMETHEMES_BASE_URL = 'https://api.animethemes.moe';

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

export const animeApi = {
  // Get top anime sorted by rating (using AniList)
  async getTopAnime(
    page = 1, 
    limit = 24,
    filters?: {
      genres?: string[];
      tags?: string[];
      format?: string[];
      status?: string[];
    },
    useJikan = true
  ): Promise<Anime[]> {
    try {
      // Prepare filters for AniList (convert tags to numbers)
      const anilistFilters = filters ? {
        ...filters,
        tags: convertTagsToNumbers(filters.tags)
      } : undefined;
      
      const anilistResults = await anilistApi.getTopAnime(page, limit, anilistFilters);
      
      // If we have enough results or Jikan is disabled, return AniList results
      if (anilistResults.length >= limit || !useJikan) {
        return anilistResults;
      }
      
      // Fall back to Jikan if AniList doesn't have enough results
      try {
        const jikanResults = await jikanApi.getTopAnime(page, limit);
        const combinedResults = mergeAnimeResults([...anilistResults, ...jikanResults]);
        return combinedResults.slice(0, limit);
      } catch (jikanError) {
        console.error('Jikan API fallback failed, using AniList results only:', jikanError);
        return anilistResults;
      }
    } catch (error) {
      console.error('Error fetching top anime:', error);
      
      // Show user-friendly error message
      const apiError = error as APIError;
      if (apiError?.isRateLimited) {
        toast({
          title: "⏱️ Rate Limited",
          description: apiError.message,
          variant: "destructive",
        });
      } else if (apiError?.statusCode) {
        toast({
          title: "⚠️ API Error",
          description: apiError.message || 'Failed to fetch anime. Please try again later.',
          variant: "destructive",
        });
      }
      
      return [];
    }
  },

  // Get current season anime (using AniList)
  async getCurrentSeasonAnime(): Promise<Anime[]> {
    try {
      return await anilistApi.getCurrentSeasonAnime(12);
    } catch (error) {
      console.error('Error fetching seasonal anime:', error);
      
      // Show user-friendly error message
      const apiError = error as APIError;
      if (apiError?.isRateLimited) {
        toast({
          title: "⏱️ Rate Limited",
          description: apiError.message,
          variant: "destructive",
        });
      } else if (apiError?.statusCode) {
        toast({
          title: "⚠️ API Error",
          description: apiError.message || 'Failed to fetch seasonal anime. Please try again later.',
          variant: "destructive",
        });
      }
      
      return [];
    }
  },

  // Search anime (using AniList)
  async searchAnime(
    query: string, 
    limit = 20,
    filters: {
      genres?: string[];
      tags?: string[];
      format?: string[];
      status?: string[];
      includeAdult?: boolean;
    } = { includeAdult: true },
    page = 1,
    useJikan = true
  ): Promise<Anime[]> {
    // Allow search with just filters (no query)
    const hasFilters = filters && (
      (filters.genres && filters.genres.length > 0) ||
      (filters.tags && filters.tags.length > 0) ||
      (filters.format && filters.format.length > 0) ||
      (filters.status && filters.status.length > 0)
    );
    
    // Return empty if no query AND no filters
    if (!query?.trim() && !hasFilters) return [];
    
    try {
      // Prepare filters for AniList (convert tags to numbers)
      const anilistFilters = filters ? {
        ...filters,
        tags: convertTagsToNumbers(filters.tags)
      } : undefined;
      
      // Try AniList first
      const anilistResults = await anilistApi.searchAnime(query, limit, anilistFilters, page);
      
      // If we have enough results or Jikan is disabled, return AniList results
      if (anilistResults.length >= 5 || !useJikan) {
        return anilistResults;
      }
      
      // Fall back to Jikan if AniList doesn't have enough results
      try {
        const jikanResults = await jikanApi.searchAnime(query, page, limit);
        const combinedResults = mergeAnimeResults([...anilistResults, ...jikanResults]);
        return combinedResults.slice(0, limit);
      } catch (jikanError) {
        console.error('Jikan API fallback failed, using AniList results only:', jikanError);
        return anilistResults;
      }
    } catch (error) {
      console.error('Error searching anime:', error);
      
      // Show user-friendly error message
      const apiError = error as APIError;
      if (apiError?.isRateLimited) {
        toast({
          title: "⏱️ Rate Limited",
          description: apiError.message,
          variant: "destructive",
        });
      } else if (apiError?.statusCode) {
        toast({
          title: "⚠️ Search Error",
          description: apiError.message || 'Failed to search anime. Please try again later.',
          variant: "destructive",
        });
      }
      
      return [];
    }
  },

  // Get anime details by ID (using AniList)
  async getAnimeById(id: number): Promise<Anime> {
    try {
      return await anilistApi.getAnimeById(id);
    } catch (error) {
      console.error('Error fetching anime by ID:', error);
      throw error;
    }
  },

  // Get anime characters and voice actors (using AniList)
  async getAnimeCharacters(id: number): Promise<AnimeCharacter[]> {
    try {
      return await anilistApi.getAnimeCharacters(id);
    } catch (error) {
      console.error('Error fetching anime characters:', error);
      return [];
    }
  },

  // Get theme songs from AnimeThemes API with MAL ID support
  async getThemeSongs(animeTitle: string, malId?: number): Promise<ThemeSong[]> {
    try {
      // Define interfaces for API response
      interface AnimeThemeVideo {
        id: number;
        basename: string;
        filename: string;
        link: string;
        audio?: string;
        quality?: string;
        tags: string[];
      }

      interface AnimeThemeEntry {
        videos?: AnimeThemeVideo[];
      }

      interface AnimeThemeSongArtist {
        name: string;
      }

      interface AnimeThemeSong {
        title: string;
        artists?: AnimeThemeSongArtist[];
      }

      interface AnimeTheme {
        id: number;
        type: string;
        sequence: number | null;
        slug: string;
        song: AnimeThemeSong;
        animethemeentries: AnimeThemeEntry[];
      }

      interface AnimeThemesAnime {
        id: number;
        animethemes: AnimeTheme[];
      }

      // Try to find by MAL ID first (more accurate)
      const searchUrl = malId 
        ? `${ANIMETHEMES_BASE_URL}/anime?filter[has]=resources&filter[site]=myanimelist&filter[external_id]=${malId}&include=animethemes.animethemeentries.videos,animethemes.song.artists`
        : `${ANIMETHEMES_BASE_URL}/anime?filter[text]=${encodeURIComponent(animeTitle.replace(/[:|-]/g, ' '))}&include=animethemes.animethemeentries.videos,animethemes.song.artists`;
      
      const response = await fetch(searchUrl);
      const { anime = [] } = await response.json() as { anime: AnimeThemesAnime[] };
      
      if (anime.length === 0 && malId) {
        // Fall back to title search if MAL ID search fails
        return this.getThemeSongs(animeTitle);
      }

      const themes = anime.flatMap((a: AnimeThemesAnime) => 
        (a.animethemes || []).map((theme: AnimeTheme) => ({
          id: theme.id,
          type: (theme.type === 'OP' ? 'OP' : 'ED') as 'OP' | 'ED',
          sequence: theme.sequence || 1,
          slug: theme.slug,
          song: {
            title: theme.song?.title || 'Unknown',
            artists: theme.song?.artists?.map((artist: AnimeThemeSongArtist) => ({ 
              name: artist.name 
            })) || []
          },
          videos: theme.animethemeentries?.flatMap((entry: AnimeThemeEntry) => 
            entry.videos?.map((v: AnimeThemeVideo) => ({
              id: v.id,
              basename: v.basename,
              filename: v.filename,
              link: v.link,
              audio: v.audio,
              quality: v.quality,
              tags: v.tags || []
            })) || []
          ) || []
        }))
      );

      return themes;
    } catch (error) {
      console.error('Error fetching theme songs:', error);
      return [];
    }
  },

  // Search characters (using AniList)
  async searchCharacters(
    query: string, 
    limit = 10,
    filters?: {
      role?: string[];
      sort?: string;
    },
    page = 1
  ): Promise<Character[]> {
    try {
      // Handle case when a character object is passed directly (from click)
      if (typeof query === 'object' && query !== null) {
        const character = query as unknown as Character;
        if (character.mal_id) {
          return [character];
        }
        return [];
      }

      // Handle string query
      if (typeof query === 'string') {
        // Check if we have any filters
        const hasFilters = filters && (
          (filters.role && filters.role.length > 0) ||
          filters.sort
        );
        
        // Return empty if no query AND no filters
        if (!query.trim() && !hasFilters) return [];
        
        return await anilistApi.searchCharacters(query, limit, filters, page);
      }

      return [];
    } catch (error) {
      console.error('Error searching characters:', {
        error,
        query,
        filters,
        page,
        limit
      });
      return [];
    }
  },

  // Get top characters by favorites (using AniList)
  async getTopCharacters(
    page = 1, 
    limit = 50,
    filters?: {
      role?: string[];
      sort?: string;
    }
  ): Promise<Character[]> {
    try {
      return await anilistApi.getTopCharacters(page, limit, filters);
    } catch (error) {
      console.error('Error fetching top characters:', error);
      return [];
    }
  },

  // Get the best audio URL from a theme song (prioritizes dedicated audio files)
  getBestAudioUrl(theme: ThemeSong): string | null {
    if (!theme.videos || theme.videos.length === 0) {
      return null;
    }

    // Sort videos to get the best quality with audio
    const bestVideo = theme.videos
      .filter(v => v.audio || v.link)
      .sort((a, b) => {
        // Prioritize videos with dedicated audio
        if (a.audio && !b.audio) return -1;
        if (!a.audio && b.audio) return 1;
        
        // Then sort by quality
        const qualityOrder = { '1080p': 3, '720p': 2, '480p': 1, '360p': 0 };
        const aQuality = a.quality ? qualityOrder[a.quality as keyof typeof qualityOrder] ?? -1 : -1;
        const bQuality = b.quality ? qualityOrder[b.quality as keyof typeof qualityOrder] ?? -1 : -1;
        
        return bQuality - aQuality;
      })[0];

    return bestVideo?.audio || bestVideo?.link || null;
  },
};
